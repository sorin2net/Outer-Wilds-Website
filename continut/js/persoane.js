async function incarcaPersoane() {
    try {
        const response = await fetch('resurse/persoane.xml');
        
        if (!response.ok) {
            throw new Error(`Eroare la aducerea fisierului XML: ${response.status}`);
        }

        const textXml = await response.text();

        //  transform textul brut intr-un obiect pe care JavaScript il intelege (DOM)
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textXml, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            throw new Error("Fișierul XML conține erori de sintaxă.");
        }

        // construiesc tabelul HTML bazat pe datele din XML
        genereazaTabelHTML(xmlDoc);

    } catch (eroare) {
        document.getElementById("mesaj-incarcare").innerHTML = "<span style='color:red;'>Eroare: " + eroare.message + "</span>";
        console.error(eroare);
    }
}

function genereazaTabelHTML(xmlDoc) {
    // elementele <persoana> din XML
    const persoane = xmlDoc.getElementsByTagName("persoana");
    
    // construim tabelul ca un string HTML
    let tabelHTML = `
        <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px;" class="destinations-table">
            <thead>
                <tr>
                    <th>Nume</th>
                    <th>Prenume</th>
                    <th>Vârstă</th>
                    <th>Email Contact</th>
                    <th>Educație</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Parcurgem fiecare persoana din XML si extragem datele
    for (let i = 0; i < persoane.length; i++) {
        const pers = persoane[i];
        
        // Extragem valorile din tag-urile copil 
        const nume = pers.getElementsByTagName("nume")[0]?.textContent || "N/A";
        const prenume = pers.getElementsByTagName("prenume")[0]?.textContent || "N/A";
        const varsta = pers.getElementsByTagName("varsta")[0]?.textContent || "N/A";
        const email = pers.getElementsByTagName("email")[0]?.textContent || "N/A";
        const institutie = pers.getElementsByTagName("institutie")[0]?.textContent || "N/A";

        // adaug un rand pt fiecare pers
        tabelHTML += `
            <tr>
                <td>${nume}</td>
                <td>${prenume}</td>
                <td>${varsta}</td>
                <td>${email}</td>
                <td>${institutie}</td>
            </tr>
        `;
    }

    tabelHTML += `
            </tbody>
        </table>
    `;

    // Stergem mesajul de "Se incarca..."
    document.getElementById("mesaj-incarcare").style.display = 'none';
    
    // Injectam tabelul pe ecran
    document.getElementById("container-tabel-persoane").innerHTML = tabelHTML;
}