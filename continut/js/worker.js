// astept sa primesc un mesaj de la cumparaturi.js
self.onmessage = function(eveniment) {
    // "eveniment.data" are datele de la scriptul principal
    const produsPrimit = eveniment.data;
    
    // mesaj in consola
    console.log("[Worker]: Am primit un produs nou de adăugat!", produsPrimit);
    

    // ca sa notific script ul care a trimis datele ca am terminat ii trimit produsul inapoi
    self.postMessage(produsPrimit); 
};