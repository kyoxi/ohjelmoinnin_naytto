const API_URL = 'http://localhost:3000/api';

const App = {
    // Tila (State)
    data: {
        users: JSON.parse(localStorage.getItem('k_users')) || {}, 
        items: [], 
        currentUser: sessionStorage.getItem('k_user') || null,
        activeFilter: 'kaikki',
        searchTerm: ''
    },

    // Alustus
    async init() {
        console.log("App alustetaan...");
        
        if (this.data.currentUser) {
            this.showApp();
            await this.lataaPalvelimelta();
        }
    },

    // --- PALVELINYHTEYDET ---
    async lataaPalvelimelta() {
        this.setLoading(true);
        try {
            const response = await fetch(`${API_URL}/items`);
            if (!response.ok) throw new Error("Haku epäonnistui");
            this.data.items = await response.json();
            
            const otsikkoElem = document.getElementById('listan-otsikko');
            const otsikko = otsikkoElem ? otsikkoElem.innerText : '';
            let moodi = 'kaikki';
            if (otsikko.includes('Omat ilmoituksesi')) moodi = 'omat';
            if (otsikko.includes('Omat keskustelusi')) moodi = 'viestit';
            
            this.renderList(moodi);
        } catch (e) {
            console.error("Virhe ladattaessa:", e);
        } finally {
            this.setLoading(false);
        }
    },

    // --- AUTENTIKAATIO ---
    handleAuth() {
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();

        if (u.length < 3) return alert("Tunnus liian lyhyt!");

        if (!this.data.users[u]) {
            this.data.users[u] = p;
            localStorage.setItem('k_users', JSON.stringify(this.data.users));
            alert("Tunnus luotu!");
        } else if (this.data.users[u] !== p) {
            return alert("Väärä salasana!");
        }

        this.data.currentUser = u;
        sessionStorage.setItem('k_user', u);
        this.showApp();
        this.lataaPalvelimelta();
    },

    logout() {
        sessionStorage.removeItem('k_user');
        location.reload();
    },

    showApp() {
        const auth = document.getElementById('auth-section');
        const main = document.getElementById('main-section');
        const userDisp = document.getElementById('user-display');

        if (auth) auth.classList.add('hidden');
        if (main) main.classList.remove('hidden');
        if (userDisp) userDisp.innerText = this.data.currentUser;
    },

    // --- TOIMINNALLISUUDET ---
    async lisaaIlmoitus() {
        const nimi = document.getElementById('p-nimi').value.trim();
        const kuvaus = document.getElementById('p-kuvaus').value.trim();
        const kategoria = document.getElementById('p-kategoria').value;
        const hinta = document.getElementById('p-hinta').value;
        const kuvaInput = document.getElementById('p-kuva');

        if (!nimi || !kuvaus) return alert("Täytä pakolliset kentät!");

        let imgBase64 = null;
        if (kuvaInput.files && kuvaInput.files[0]) {
            imgBase64 = await this.fileToBase64(kuvaInput.files[0]);
        }

        const uusi = {
            owner: this.data.currentUser,
            name: nimi,
            desc: kuvaus,
            cat: kategoria,
            price: (kategoria === "Myydään" || kategoria === "Vuokrataan") ? hinta : null,
            img: imgBase64,
            date: new Date().toLocaleDateString('fi-FI'),
            messages: []
        };

        try {
            const res = await fetch(`${API_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uusi)
            });
            if (res.ok) {
                this.tyhjennaLomake();
                await this.lataaPalvelimelta();
            }
        } catch (e) { alert("Virhe tallennuksessa"); }
    },

    async lahetaViesti(id) {
        const inp = document.getElementById(`in-${id}`);
        const teksti = inp.value.trim();
        if (!teksti) return;

        const item = this.data.items.find(i => i.id == id);
        const viesti = { from: this.data.currentUser, txt: teksti, to: item.owner };

        try {
            const res = await fetch(`${API_URL}/items/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(viesti)
            });
            if (res.ok) {
                inp.value = '';
                await this.lataaPalvelimelta();
            }
        } catch (e) { alert("Viesti ei kulkenut"); }
    },

    async poista(id) {
        if (!confirm("Poistetaanko ilmoitus?")) return;
        try {
            await fetch(`${API_URL}/items/${id}`, { method: 'DELETE' });
            await this.lataaPalvelimelta();
        } catch (e) { alert("Poisto epäonnistui"); }
    },

    // UUSI: Viestin poistaminen (Admin tai oma viesti)
    async poistaViesti(itemId, index) {
        if (!confirm("Haluatko varmasti poistaa tämän viestin?")) return;

        const item = this.data.items.find(i => i.id == itemId);
        if (!item) return;

        const uudetViestit = [...item.messages];
        uudetViestit.splice(index, 1);

        try {
            const res = await fetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: uudetViestit })
            });

            if (res.ok) {
                await this.lataaPalvelimelta();
            }
        } catch (e) {
            alert("Viestin poisto epäonnistui");
        }
    },

    // --- UI JA RENDERÖINTI ---
    naytaSivu(moodi) {
        this.renderList(moodi);
    },

    suodata() {
        this.data.searchTerm = document.getElementById('haku-kentta').value.toLowerCase();
        this.data.activeFilter = document.getElementById('suodatin-kategoria').value;
        this.renderList('kaikki');
    },

    renderList(moodi) {
        const container = document.getElementById('tuotelista');
        const otsikko = document.getElementById('listan-otsikko');
        if (!container) return;

        container.innerHTML = '';
        let naytettavat = [...this.data.items];

        if (moodi === 'omat') {
            naytettavat = naytettavat.filter(i => i.owner === this.data.currentUser);
            otsikko.innerText = "Omat ilmoituksesi";
        } else if (moodi === 'viestit') {
            naytettavat = naytettavat.filter(i => 
                i.owner === this.data.currentUser || 
                i.messages.some(m => m.from === this.data.currentUser || m.to === this.data.currentUser)
            );
            otsikko.innerText = "Omat keskustelusi";
        } else {
            otsikko.innerText = "Tuoreimmat ilmoitukset";
        }

        if (this.data.activeFilter !== 'kaikki') {
            naytettavat = naytettavat.filter(i => i.cat === this.data.activeFilter);
        }
        if (this.data.searchTerm) {
            naytettavat = naytettavat.filter(i => 
                i.name.toLowerCase().includes(this.data.searchTerm) || 
                i.desc.toLowerCase().includes(this.data.searchTerm)
            );
        }

        naytettavat.forEach(item => {
            container.innerHTML += this.renderItem(item);
        });
    },

    renderItem(item) {
        const isOwner = item.owner === this.data.currentUser;
        const isAdmin = this.data.currentUser === 'admin';

        return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-blue-500">${item.cat}</span>
                        <h3 class="text-xl font-bold text-slate-800">${item.name}</h3>
                        <p class="text-slate-500 text-sm">Julkaistu: ${item.date} • Myyjä: ${item.owner}</p>
                    </div>
                    ${item.price ? `<div class="text-2xl font-black text-blue-600">${item.price}€</div>` : ''}
                </div>
                <p class="text-slate-600 mb-4">${item.desc}</p>
                ${item.img ? `<img src="${item.img}" class="w-full h-48 object-cover rounded-xl mb-4">` : ''}
                
                <div class="border-t pt-4">
                    <div class="space-y-2 mb-4">
                        ${item.messages.map((m, index) => `
                            <div class="text-sm p-2 rounded-lg relative ${m.from === this.data.currentUser ? 'bg-blue-50 ml-4' : 'bg-slate-50 mr-4'}">
                                <strong>${m.from}:</strong> ${m.txt}
                                ${(isAdmin || m.from === this.data.currentUser) ? `
                                    <button onclick="App.poistaViesti(${item.id}, ${index})" 
                                            class="absolute top-1 right-2 text-red-400 hover:text-red-600 font-bold" title="Poista viesti">
                                        ×
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="in-${item.id}" placeholder="Lähetä viesti..." class="flex-1 p-2 bg-slate-50 border rounded-lg outline-none">
                        <button onclick="App.lahetaViesti(${item.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Lähetä</button>
                        ${isOwner || isAdmin ? `<button onclick="App.poista(${item.id})" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100">Poista</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // Aputoiminnot
    setLoading(s) {
        const l = document.getElementById('loading-indicator');
        if (l) l.classList.toggle('hidden', !s);
    },

    tarkistaHinta() {
        const kat = document.getElementById('p-kategoria').value;
        const cont = document.getElementById('hinta-container');
        if (cont) cont.style.display = (kat === "Myydään" || kat === "Vuokrataan") ? 'block' : 'none';
    },

    fileToBase64(file) {
        return new Promise((r, j) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => r(reader.result);
            reader.onerror = e => j(e);
        });
    },

    tyhjennaLomake() {
        ['p-nimi', 'p-kuvaus', 'p-hinta', 'p-kuva'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }
};

window.onload = () => App.init();