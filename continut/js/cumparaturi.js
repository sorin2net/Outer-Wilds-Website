class Produs {
    constructor(id, nume, cantitate) {
        this.id = id;
        this.nume = nume;
        this.cantitate = cantitate;
    }
}

// interfata
class StocareBaza {
    async salveaza(produs) { console.error("Trebuie implementat in clasa copil!"); }
    async preiaToate() { console.error("Trebuie implementat in clasa copil!"); return []; }
}

// copil pt local storage
class StocareLocal extends StocareBaza {
    async salveaza(produs) {
        let lista = await this.preiaToate();
        
        let index = lista.findIndex(p => p.id === produs.id);
        if (index !== -1) {
            lista[index] = produs; 
        } else {
            lista.push(produs);    
        }
        
        localStorage.setItem('listaProvizii', JSON.stringify(lista));
    }
    
    async preiaToate() {
        let listaSalvata = localStorage.getItem('listaProvizii');
        return listaSalvata ? JSON.parse(listaSalvata) : [];
    }
}

// copil pentru baza de data avansata a browser ului
class StocareIndexedDB extends StocareBaza {
    async initDB() {
        return new Promise((resolve, reject) => {
            let cerere = indexedDB.open("BazaProvizii", 1);
            
            // daca e prima data cand o deschidem, ii cream structura (tabelul) sau daca ii schimb structura
            cerere.onupgradeneeded = (e) => {
                let db = e.target.result;
                if (!db.objectStoreNames.contains("produse")) {
                    db.createObjectStore("produse", { keyPath: "id" });
                }
            };
            cerere.onsuccess = (e) => resolve(e.target.result);
            cerere.onerror = () => reject("Eroare la deschiderea IndexedDB");
        });
    }

    async salveaza(produs) {
        let db = await this.initDB();
        return new Promise((resolve, reject) => {
            let tranzactie = db.transaction(["produse"], "readwrite");
            let store = tranzactie.objectStore("produse");
            store.put(produs); // inseram randul in BD, daca exista deja, il actualizez
            
            tranzactie.oncomplete = () => resolve();
            tranzactie.onerror = () => reject();
        });
    }

    async preiaToate() {
        let db = await this.initDB();
        return new Promise((resolve, reject) => {
            let tranzactie = db.transaction(["produse"], "readonly");
            let store = tranzactie.objectStore("produse");
            let cerere = store.getAll(); 
            
            cerere.onsuccess = () => resolve(cerere.result);
            cerere.onerror = () => reject();
        });
    }
}

let asistentWorker = null;

function adaugaRandInTabel(produs) {
    const tbody = document.getElementById('tabel-cumparaturi-body');
    if (!tbody) return;
    
    let tr = document.createElement('tr');
    tr.innerHTML = `<td>${produs.id}</td><td>${produs.nume}</td><td>${produs.cantitate}</td>`;
    tbody.appendChild(tr);
}

// rescrie complet tabelul folosind metoda de stocare curenta
async function afiseazaTabel(obiectStocare) {
    const tbody = document.getElementById('tabel-cumparaturi-body');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Curatam
    let produse = await obiectStocare.preiaToate(); // luam lista (fie din local, fie din IndexedDB)
    produse.forEach(produs => adaugaRandInTabel(produs));
}

function initCumparaturi() {
    const selectorMetoda = document.getElementById("metoda-stocare");
    
    // functia care imi da obiectul cerut
    function alegeStocarea() {
        if (selectorMetoda.value === "indexed") {
            return new StocareIndexedDB();
        } else {
            return new StocareLocal();
        }
    }

    // cand intram pe pagina, afisam tabelul cu metoda selectata in acel moment
    afiseazaTabel(alegeStocarea());

    // daca schimb dropdown ul schimb si tabelul
    selectorMetoda.addEventListener("change", () => {
        afiseazaTabel(alegeStocarea());
    });

    // webworker
    if (window.Worker && !asistentWorker) {
        asistentWorker = new Worker('js/worker.js');
        
        asistentWorker.onmessage = async function(eveniment) {
            const produsConfirmat = eveniment.data;
            console.log("[Main Script]: Worker-ul a confirmat adăugarea:", produsConfirmat);
            
            // aflu in ce mod sunt si salvez in db
            const stocareCurenta = alegeStocarea();
            await stocareCurenta.salveaza(produsConfirmat);
            
            afiseazaTabel(stocareCurenta);
        };
    }

    const btnAdauga = document.getElementById('buton-adauga-produs');
    if (!btnAdauga) return;
    
    const btnClona = btnAdauga.cloneNode(true);
    btnAdauga.parentNode.replaceChild(btnClona, btnAdauga);

    btnClona.addEventListener('click', async () => {
        const inputNume = document.getElementById('nume-produs');
        const inputCantitate = document.getElementById('cantitate-produs');
        
        const numeVal = inputNume.value.trim();
        const cantitateVal = inputCantitate.value.trim();

        if (!numeVal || !cantitateVal) {
            alert("Te rugăm să completezi ambele câmpuri!");
            return;
        }

        const cantitateAdaugata = parseInt(cantitateVal, 10);

        if (isNaN(cantitateAdaugata) || cantitateAdaugata <= 0) {
            alert("Eroare: Cantitatea trebuie să fie un număr valid, mai mare decât 0!");
            return;
        }

        const stocareCurenta = alegeStocarea();
        const listaCurenta = await stocareCurenta.preiaToate();
        
        let produsExistent = listaCurenta.find(p => p.nume.toLowerCase() === numeVal.toLowerCase());
        let produsDeSalvat;

        if (produsExistent) {
            const cantitateVeche = parseInt(produsExistent.cantitate, 10);
            produsExistent.cantitate = cantitateVeche + cantitateAdaugata;
            produsDeSalvat = produsExistent;
        } else {
            const noulId = listaCurenta.length > 0 ? Math.max(...listaCurenta.map(p => p.id)) + 1 : 1;
            produsDeSalvat = new Produs(noulId, numeVal, cantitateAdaugata);
        }

        inputNume.value = "";
        inputCantitate.value = "";

        if (asistentWorker) {
            asistentWorker.postMessage(produsDeSalvat);
        } else {
            await stocareCurenta.salveaza(produsDeSalvat);
            afiseazaTabel(stocareCurenta);
        }
    });
}