import socket
import os
import threading 
import gzip     
from concurrent.futures import ThreadPoolExecutor 

director_continut = os.path.join(os.path.dirname(__file__), '..', 'continut')

# dictionar cu tipurile de fisiere
tipuri_continut = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.json': 'application/json',  
    '.xml': 'application/xml'
}

# Aceasta functie va rula in paralel pentru fiecare utilizator care intra pe site
def proceseaza_cererea(clientsocket, address):
    try:
        data = clientsocket.recv(1024)
        if not data:
            clientsocket.close()
            return
            
        cerere = data.decode('utf-8')
        pozitie = cerere.find('\r\n')
        
        if pozitie > -1:
            linieDeStart = cerere[0:pozitie]
            elemente = linieDeStart.split(' ')
            
            if len(elemente) > 1:
                metoda = elemente[0] # Extragem metoda: va fi "GET" sau "POST"
                numeResursa = elemente[1]
                
                if metoda == 'POST':
                    if numeResursa == '/api/utilizatori':
                        import json 
                        
                        # determin dimensiunea cu content length in header
                        lungime_continut = 0
                        linii_header = cerere.split('\r\n')
                        for linie in linii_header:
                            if linie.lower().startswith('content-length:'):
                                lungime_continut = int(linie.split(':')[1].strip())
                        
                        # citesc pachetul de date din socket
                        corpul_cererii = cerere.split('\r\n\r\n')[1]
                        while len(corpul_cererii.encode('utf-8')) < lungime_continut:
                            corpul_cererii += clientsocket.recv(1024).decode('utf-8')

                        
                        try:
                            # trimit textul din js in dictionar
                            date_noi = json.loads(corpul_cererii) 
                            
                            # caut fisierul in resurse
                            cale_json = os.path.join(director_continut, 'resurse', 'utilizatori.json')
                            lista_utilizatori = []
                            
                            # daca deja exista doar il citesc
                            if os.path.exists(cale_json):
                                with open(cale_json, 'r', encoding='utf-8') as f:
                                    lista_utilizatori = json.load(f)
                            
                            
                            # verific daca combinatia utilizator + parola exista deja
                            utilizator_existent = any(
                                u['utilizator'] == date_noi['utilizator'] and u['parola'] == date_noi['parola']
                                for u in lista_utilizatori
                            )

                            if utilizator_existent:
                                # trimit 409 Conflict - utilizatorul exista deja
                                raspuns_conflict = "HTTP/1.1 409 Conflict\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                                clientsocket.sendall(raspuns_conflict.encode('utf-8'))
                                return

                            # daca nu exista, adaug datele in lista
                            lista_utilizatori.append(date_noi)
                            
                            # Rescriem fisierul cu lista noua
                            with open(cale_json, 'w', encoding='utf-8') as f:
                                json.dump(lista_utilizatori, f, indent=4)
                            
                            # trimit raspuns 200 sa stie js ul ca totul e bine
                            raspuns_ok = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                            clientsocket.sendall(raspuns_ok.encode('utf-8'))
                            
                        except Exception as e:
                            print("Eroare la parsarea/salvarea JSON-ului:", e)
                            eroare_srv = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                            clientsocket.sendall(eroare_srv.encode('utf-8'))
                        
                        return # Oprim executia pentru /api/utilizatori
                    
                    # Daca este alt formular POST ( cel din DESPRE), aratam pagina cu "Transmisie Reusita"
                   
                # aici e pentru metoda GET
                # Daca scriem in browser doar "localhost:5678/", il trimitem la "index.html"
                if numeResursa == '/':
                    numeResursa = '/index.html'
                    
                # lstrip('/') sterge bara de la inceput ca sa putem uni calea corect cu os.path.join
                cale_fisier = os.path.join(director_continut, numeResursa.lstrip('/'))
                
                print(f"Cerere pentru: {numeResursa}")
                
                # VERIFICAM DACA FISIERUL EXISTA 
                if os.path.exists(cale_fisier) and os.path.isfile(cale_fisier):
                    #  DETERMINAM CONTENT-TYPE
                    _, extensie = os.path.splitext(cale_fisier) # extrage extensia 
                    extensie = extensie.lower()
                    
                    # Cautam extensia in dictionarul nostru, daca nu e oo dai tipul binar generic
                    content_type = tipuri_continut.get(extensie, 'application/octet-stream')
                    
                    # CITIM FISIERUL ( 'rb' pt ca pot fi si imagini/video)
                    with open(cale_fisier, 'rb') as f:
                        continut_fisier = f.read()

                    # Verificam daca browserul suporta gzip din textul cererii
                    suporta_gzip = 'Accept-Encoding' in cerere and 'gzip' in cerere
                    extra_header = ""
                    
                    # Arhivam doar textul (html, css, js). Nu are sens sa arhivam imagini sau video
                    if suporta_gzip and extensie in ['.html', '.css', '.js']:
                        continut_final = gzip.compress(continut_fisier)
                        extra_header = "Content-Encoding: gzip\r\n"
                    else:
                        continut_final = continut_fisier
                    
                    
                    # CONSTRUIM RASPUNSUL 200 OK
                    header = "HTTP/1.1 200 OK\r\n"
                    header += f"Content-Length: {len(continut_final)}\r\n" # Folosim lungimea continutului final (posibil arhivat)
                    header += f"Content-Type: {content_type}\r\n"
                    header += extra_header # Adaugam linia cu gzip daca a fost comprimat
                    header += "Server: OuterWildsServer\r\n"
                    header += "Connection: close\r\n\r\n"
                    
                    # Trimitem headerul (text) + fisierul (biti)
                    clientsocket.sendall(header.encode('utf-8') + continut_final)
                    
                else:
                    # TRATAM SITUATIA IN CARE RESURSA NU EXISTA (404 Not Found)
                    print(f" EROARE 404: Nu am gasit {cale_fisier}")
                    mesaj_404 = "<h1>Eroare 404 - Semnal Pierdut</h1><p>Naveta s-a prabusit, nu putem gasi fisierul cerut.</p>"
                    
                    header_404 = "HTTP/1.1 404 Not Found\r\n"
                    header_404 += f"Content-Length: {len(mesaj_404.encode('utf-8'))}\r\n"
                    header_404 += "Content-Type: text/html; charset=utf-8\r\n"
                    header_404 += "Connection: close\r\n\r\n"
                    
                    clientsocket.sendall(header_404.encode('utf-8') + mesaj_404.encode('utf-8'))
    except Exception as e:
        print(f"Eroare de conexiune: {e}")
    finally:
        clientsocket.close()

serversocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
serversocket.bind(('', 5678))
serversocket.listen(5)

print("=====================================================")
print(" Serverul Outer Wilds este LIVE pe portul 5678!")
print(f" Serveste fisiere din: {director_continut}")
print(" Modul Multithreading & GZIP Activat!")
print("=====================================================")

#fac un threadpool cu 50 de fire
pool_angajati = ThreadPoolExecutor(max_workers=50) 

while True:
    #astept pana e cineva scrie adresa in browser
    (clientsocket, address) = serversocket.accept()
    
    pool_angajati.submit(proceseaza_cererea, clientsocket, address)