function initInvata() {

    const elementUrl = document.getElementById("url-curent");

    if (!elementUrl) return;

    elementUrl.innerHTML = window.location.href;
    document.getElementById("browser-curent").innerHTML = navigator.appName + " (" + navigator.userAgent + ")";
    document.getElementById("os-curent").innerHTML = navigator.platform;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                document.getElementById("locatie-curenta").innerHTML =
                    "Latitudine: " + position.coords.latitude +
                    " | Longitudine: " + position.coords.longitude;
            },
            function (error) {
                document.getElementById("locatie-curenta").innerHTML = "Senzor blocat sau semnal pierdut.";
            }
        );
    } else {
        document.getElementById("locatie-curenta").innerHTML = "Browserul nu suportă geolocația.";
    }

    actualizeazaTimpul();
    if (window._intervalTiMp) clearInterval(window._intervalTiMp);
    window._intervalTiMp = setInterval(function () {
        if (document.getElementById("timp-curent")) {
            actualizeazaTimpul();
        } else {
            clearInterval(window._intervalTiMp);
        }
    }, 1000);




    const canvas = document.getElementById("radarCanvas");
    const ctx = canvas.getContext("2d");

    deseneazaFundalRadar(ctx, canvas.width, canvas.height);

    let primClickSeta = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", function (eveniment) {

        const rect = canvas.getBoundingClientRect();

        const scaraX = canvas.width / rect.width;
        const scaraY = canvas.height / rect.height;

        const mouseX = (eveniment.clientX - rect.left) * scaraX;
        const mouseY = (eveniment.clientY - rect.top) * scaraY;


        if (!primClickSeta) {
            startX = mouseX;
            startY = mouseY;
            primClickSeta = true;

            ctx.fillStyle = "white";
            ctx.fillRect(startX - 2, startY - 2, 4, 4);
        } else {
            const endX = mouseX;
            const endY = mouseY;

            const latime = endX - startX;
            const inaltime = endY - startY;

            const culContur = document.getElementById("culoare-contur").value;
            const culUmplere = document.getElementById("culoare-umplere").value;

            ctx.fillStyle = culUmplere;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(startX, startY, latime, inaltime);

            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = culContur;
            ctx.lineWidth = 3;
            ctx.strokeRect(startX, startY, latime, inaltime);

            primClickSeta = false;
        }
    });

    function deseneazaFundalRadar(context, w, h) {
        context.strokeStyle = "#1a3a3a";
        context.lineWidth = 1;
        for (let i = 0; i <= w; i += 50) {
            context.beginPath(); context.moveTo(i, 0); context.lineTo(i, h); context.stroke();
        }
        for (let j = 0; j <= h; j += 50) {
            context.beginPath(); context.moveTo(0, j); context.lineTo(w, j); context.stroke();
        }

        context.beginPath();
        context.arc(w / 2, h / 2, 60, 0, 2 * Math.PI);
        context.fillStyle = "#2A4030";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "#48D1CC";
        context.stroke();

        context.fillStyle = "#48D1CC";
        context.font = "16px monospace";
        context.fillText("Radar Activ: Orbita Giant's Deep", 15, 25);
    }
};

function actualizeazaTimpul() {
    const acum = new Date();

    const oraExacta = acum.toLocaleTimeString('ro-RO');
    const dataExacta = acum.toLocaleDateString('ro-RO');

    document.getElementById("timp-curent").innerHTML = oraExacta + " | " + dataExacta;
}



function adaugaLinie() {
    const index = parseInt(document.getElementById("index-tabel").value);
    const culoare = document.getElementById("culoare-tabel").value;
    const tabel = document.getElementById("bazaDateLoguri");

    if (isNaN(index) || index < 0 || index > tabel.rows.length) {
        alert("Te rugăm să introduci un index valid pentru linie.");
        return;
    }

    let numarColoane = 0;
    if (tabel.rows.length > 0) {
        numarColoane = tabel.rows[0].cells.length;
    }

    const randNou = tabel.insertRow(index);

    for (let i = 0; i < numarColoane; i++) {
        const celulaNoua = randNou.insertCell(i);
        celulaNoua.className = "delimitator-tabel";
        celulaNoua.style.backgroundColor = culoare;
        celulaNoua.style.height = "6px";
    }
}

function adaugaColoana() {
    const index = parseInt(document.getElementById("index-tabel").value);
    const culoare = document.getElementById("culoare-tabel").value;
    const tabel = document.getElementById("bazaDateLoguri");

    let numarColoane = 0;
    if (tabel.rows.length > 0) {
        numarColoane = tabel.rows[0].cells.length;
    }

    if (isNaN(index) || index < 0 || index > numarColoane) {
        alert("Te rugăm să introduci un index valid pentru coloană.");
        return;
    }

    for (let i = 0; i < tabel.rows.length; i++) {
        const randCurent = tabel.rows[i];

        let indexCorect = index;
        if (index > randCurent.cells.length) {
            indexCorect = randCurent.cells.length;
        }

        const celulaNoua = randCurent.insertCell(indexCorect);
        celulaNoua.className = "delimitator-tabel";
        celulaNoua.style.backgroundColor = culoare;
        celulaNoua.style.width = "6px";
    }
}







// PREVIEW VIDEO LA HOVER 
function initVideoPreview() {
    const tooltipExistent = document.getElementById('planet-video-tooltip');
    if (tooltipExistent) {
        tooltipExistent.remove();
    }

    const tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'planet-video-tooltip';
    tooltipDiv.innerHTML = '<video id="hover-video" autoplay loop muted playsinline></video>';
    document.body.appendChild(tooltipDiv);

    const hoverVideo = document.getElementById('hover-video');
    //aici returneaza toate elem cu clasa planet-preview ca o lista (din tabel si svg)
    const planetElements = document.querySelectorAll('.planet-preview');

    planetElements.forEach(planet => {
        planet.addEventListener('mouseenter', (e) => {
            const videoSrc = planet.getAttribute('data-video');
            if (videoSrc) {
                hoverVideo.src = videoSrc;
                tooltipDiv.style.display = 'block';
                hoverVideo.play().catch(err => console.log("Autoplay blocat", err));
            }
        });

        planet.addEventListener('mousemove', (e) => {
            tooltipDiv.style.left = (e.clientX + 15) + 'px'; //css cere unitatea de masura pixels
            tooltipDiv.style.top = (e.clientY + 15) + 'px';
        });

        planet.addEventListener('mouseleave', () => {
            tooltipDiv.style.display = 'none';
            hoverVideo.pause();
            hoverVideo.src = '';
        });
    });
}


function initFormulare() {
    const formulare = document.querySelectorAll("form");

    formulare.forEach(formular => {
        // Stergem un event vechi daca exista ca sa nu dea dublu-alert
        formular.removeEventListener("submit", validareSiTrimitere);
        formular.addEventListener("submit", validareSiTrimitere);
    });
}

function validareSiTrimitere(eveniment) {
    eveniment.preventDefault();
    const formular = eveniment.target;

    const campParola = formular.querySelector("#parola"); // Formular Inregistrare
    const campSugestie = formular.querySelector("#sugestie"); // Formular Despre

    if (campParola) {
        const bifaAcord = formular.querySelector("#acord");
        if (bifaAcord && !bifaAcord.checked) {
            alert("Sistemele raportează o eroare:\n\n- Trebuie să fii de acord cu condițiile programului spațial.");
            return;
        }
        const emailValoare  = formular.querySelector("#email")?.value || "";
        const parolaValoare = campParola.value;
        const varstaInput = formular.querySelector("#varsta");
        const varstaValoare = varstaInput ? parseInt(varstaInput.value) : 0;

        let erori = [];
        if (parolaValoare.length < 8) erori.push("Codul de acces trebuie să aibă minimum 8 caractere.");
        if (varstaValoare < 16) erori.push("Vârsta declarată este prea mică (Minim 16).");

        if (erori.length > 0) {
            alert("Sistemele raportează următoarele erori:\n\n- " + erori.join("\n- "));
        } else {
            alert("Date validate cu succes! Se transmite către serverul central...");

            // Construim obiectul
            const dateTrimise = {
                utilizator: emailValoare,
                parola: parolaValoare
            };

            // Trimitem datele prin fetch (AJAX) 
            fetch('/api/utilizatori', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dateTrimise)
            })
                .then(raspuns => {
                    if (raspuns.ok) {
                        alert("Succes! Observatorul a salvat datele tale.");
                        formular.reset();
                    } else if (raspuns.status === 409) {
                        alert("Eroare: Această combinație de utilizator și parolă există deja în sistem!");
                    } else {
                        alert("Eroare de la server la înregistrare.");
                    }
                })
                .catch(eroare => console.log("Eroare rețea:", eroare));
        }

    } else if (campSugestie) {
        const textSugestie = campSugestie.value;

        if (textSugestie.trim().length < 10) {
            alert("Eroare: Raportul este prea scurt (minim 10 caractere).");
        } else {
            alert("Transmisie validată! Se trimite către Observator...");

            // Nu trimitem nimic la server, doar afisam mesajul de succes direct
            document.getElementById("continut").innerHTML = `
            <div style="text-align:center; padding:50px;">
                <h1 style="color:#48D1CC;">Transmisie Reușită!</h1>
                <p>Datele tale au fost receptionate de Observatorul de pe Timber Hearth.</p>
                <button onclick="schimbaContinut('acasa', null, 'initAcasa')"
                        style="margin-top:20px; padding:10px 25px; 
                               background-color:#e67e22; color:#111; 
                               border:none; border-radius:8px;
                               font-weight:bold; cursor:pointer; font-size:16px;">
                    Întoarce-te la Bază
                </button>
            </div>`;
        }
    }
}

function initDespre() {
    initVideoPreview();
    initFormulare();
}




function initVerifica() {
    const btn = document.getElementById("buton-verificare");
    if (!btn) return;

    // Prevenim dublarea evenimentelor daca utilizatorul intra de doua ori pe pagina
    const btnCuratat = btn.cloneNode(true);
    btn.parentNode.replaceChild(btnCuratat, btn);

    btnCuratat.addEventListener("click", async function () {
        const user = document.getElementById("nume-utilizator").value.trim();
        const pass = document.getElementById("parola-utilizator").value.trim();
        const mesaj = document.getElementById("mesaj-verificare");

        if (!user || !pass) {
            mesaj.innerHTML = "<span style='color: orange;'>Introduceți ambele date!</span>";
            return;
        }

        mesaj.innerHTML = "Se contactează serverul...";

        try {
            // cer fisierul JSON de la server folosind AJAX (Fetch)
            const response = await fetch('resurse/utilizatori.json');

            if (!response.ok) throw new Error("Nu am putut accesa baza de date.");

            // transform raspunsul intr-un obiect JavaScript 
            const listaUtilizatori = await response.json();

            let accesPermis = false;
            for (let i = 0; i < listaUtilizatori.length; i++) {
                if (listaUtilizatori[i].utilizator === user && listaUtilizatori[i].parola === pass) {
                    accesPermis = true;
                    break;
                }
            }

            if (accesPermis) {
                mesaj.innerHTML = "<span style='color: #2E8B57;'>Acces Permis! Sistem deblocat.</span>";
            } else {
                mesaj.innerHTML = "<span style='color: red;'>Acces Respins! Nume sau parolă incorectă.</span>";
            }

        } catch (eroare) {
            mesaj.innerHTML = "<span style='color: red;'>Eroare conexiune: " + eroare.message + "</span>";
        }
    });
}