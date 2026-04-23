const API_URL = 'http://localhost:3000/api';

const App = {
    data: {
        users: JSON.parse(localStorage.getItem('k_users')) || {},
        items: [],
        currentUser: sessionStorage.getItem('k_user') || null,
        activeFilter: 'kaikki',
        searchTerm: ''
    },

    async init() {
        if (this.data.currentUser) {
            this.showApp();
            await this.lataaPalvelimelta();
        }
        this.tarkistaHinta();
    },

    async lataaPalvelimelta() {
        this.setLoading(true);
        try {
            const response = await fetch(`${API_URL}/items`);
            this.data.items = await response.json();
            const moodi = document.getElementById('listan-otsikko')?.innerText.includes('Omat') ? 'omat' : 'kaikki';
            this.renderList(moodi);
        } catch (e) {
            console.error("Yhteysvirhe palvelimeen.");
        } finally {
            this.setLoading(false);
        }
    },

    handleAuth() {
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        if (u.length < 3) return alert("Liian lyhyt tunnus.");

        if (!this.data.users[u]) {
            this.data.users[u] = p;
            localStorage.setItem('k_users', JSON.stringify(this.data.users));
        } else if (this.data.users[u] !== p) {
            return alert("Väärä salasana!");
        }

        this.data.currentUser = u;
        sessionStorage.setItem('k_user', u);
        this.showApp();
        this.lataaPalvelimelta();
    },

    async lisaaIlmoitus() {
        const nimi = document.getElementById('p-nimi').value.trim();
        const kuvaus = document.getElementById('p-kuvaus').value.trim();
        const kategoria = document.getElementById('p-kategoria').value;
        const hinta = document.getElementById('p-hinta').value;
        const kuvaInput = document.getElementById('p-kuva');

        if (!nimi || !kuvaus) return alert("Täytä tiedot!");

        let imgBase64 = null;
        if (kuvaInput.files.length > 0) {
            imgBase64 = await this.fileToBase64(kuvaInput.files[0]);
        }

        const uusiIlmoitus = {
            owner: this.data.currentUser,
            name: nimi,
            desc: kuvaus,
            cat: kategoria,
            price: (kategoria === "Myydään" || kategoria === "Vuokrataan") ? hinta : null,
            img: imgBase64,
            date: new Date().toLocaleDateString('fi-FI')
        };

        await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uusiIlmoitus)
        });

        location.reload(); // Päivittää sivun julkaisun jälkeen
    },

    async lahetaViesti(id) {
        const inp = document.getElementById(`in-${id}`);
        const teksti = inp.value.trim();
        if (!teksti) return;

        const item = this.data.items.find(i => i.id === id);
        const viesti = { 
            from: this.data.currentUser, 
            txt: teksti,
            to: item.owner // Kohdistetaan viesti ilmoituksen omistajalle
        };

        await fetch(`${API_URL}/items/${id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(viesti)
        });

        inp.value = '';
        await this.lataaPalvelimelta();
    },

    renderList(moodi) {
        const container = document.getElementById('tuotelista');
        const otsikko = document.getElementById('listan-otsikko');
        container.innerHTML = '';

        let naytettavat = (moodi === 'omat') ? this.data.items.filter(i => i.owner === this.data.currentUser) : this.data.items;
        otsikko.innerText = (moodi === 'omat') ? "Omat ilmoituksesi" : "Tuoreimmat ilmoitukset";

        if (this.data.activeFilter !== 'kaikki') naytettavat = naytettavat.filter(i => i.cat === this.data.activeFilter);
        if (this.data.searchTerm) {
            naytettavat = naytettavat.filter(i => i.name.toLowerCase().includes(this.data.searchTerm));
        }

        const varit = { 'Myydään': 'emerald', 'Ostetaan': 'blue', 'Annetaan': 'amber', 'Vaihdetaan': 'purple', 'Vuokrataan': 'orange' };

        naytettavat.forEach(item => {
            const vari = varit[item.cat] || 'slate';
            
            // YKSITYISVIESTIEN SUODATUS
            const viestitHtml = item.messages
                .filter(m => m.from === this.data.currentUser || item.owner === this.data.currentUser || !m.to)
                .map(m => `
                    <div class="text-[11px] p-2 rounded-lg mb-1 ${m.from === this.data.currentUser ? 'bg-blue-50 ml-4 border-l-2 border-blue-400' : 'bg-slate-50 mr-4'}">
                        <b class="text-slate-700">${m.from}:</b> ${m.txt}
                        <span class="block opacity-40 text-[9px] mt-1">🔒 Vain osapuolille</span>
                    </div>
                `).join('');

            const card = document.createElement('div');
            card.className = "bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden";
            card.innerHTML = `
                ${item.img ? `<img src="${item.img}" class="w-full h-48 object-cover">` : ''}
                <div class="p-5">
                    <span class="bg-${vari}-100 text-${vari}-700 text-[10px] font-bold px-2 py-1 rounded uppercase">${item.cat}</span>
                    <h3 class="text-lg font-bold mt-2">${item.name} ${item.price ? `<span class="text-emerald-600 ml-2">${item.price}€</span>` : ''}</h3>
                    <p class="text-slate-500 text-sm my-2">${item.desc}</p>
                    <div class="border-t mt-4 pt-4">
                        <div class="space-y-1 mb-4">${viestitHtml}</div>
                        <div class="flex gap-2">
                            <input type="text" id="in-${item.id}" placeholder="Kysy myyjältä..." class="flex-1 p-2 text-xs bg-slate-50 border rounded-lg">
                            <button onclick="App.lahetaViesti(${item.id})" class="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Lähetä</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // --- APUMETODIT ---
    suodata() {
        this.data.activeFilter = document.getElementById('suodatin-kategoria').value;
        this.data.searchTerm = document.getElementById('haku-kentta').value.toLowerCase().trim();
        this.renderList(document.getElementById('listan-otsikko').innerText.includes('Omat') ? 'omat' : 'kaikki');
    },
    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-section').classList.remove('hidden');
        document.getElementById('user-display').innerText = this.data.currentUser;
    },
    tarkistaHinta() {
        const k = document.getElementById('p-kategoria').value;
        document.getElementById('hinta-container').style.display = (k === 'Myydään' || k === 'Vuokrataan') ? 'block' : 'none';
    },
    fileToBase64(file) {
        return new Promise(res => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.readAsDataURL(file);
        });
    },
    setLoading(s) { document.getElementById('loading-indicator')?.classList.toggle('hidden', !s); },
    logout() { sessionStorage.clear(); location.reload(); },
    naytaSivu(m) { this.renderList(m); }
};

App.init();