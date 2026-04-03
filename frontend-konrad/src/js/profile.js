const API_PROFILE = 'http://127.0.0.1:8000/api/v1/buyers/compradores/me/';
const token = localStorage.getItem("access_token");

if (!token) window.location.href = "/pages/login.html";

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
    setupForm();
    setupAvatar();
    updateBadge();
});

function getUserKey() { 
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}
function getCartItems() {
    const key = `cart_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_cart_v99') || '[]');
}

async function cargarDatos() {
    // 0. CARGAR DESDE CACHÉ (Lo que ya tenemos)
    const cached = JSON.parse(localStorage.getItem('user_data') || '{}');
    
    const setIf = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    setIf('nombre',    cached.nombre || cached.first_name);
    setIf('apellido',  cached.apellido || cached.last_name);
    setIf('email',     cached.email);
    setIf('telefono',  cached.telefono);
    setIf('pais',      cached.pais);
    setIf('ciudad',    cached.ciudad);
    setIf('direccion', cached.direccion);
    setIf('instagram', cached.instagram);
    
    const circle = document.getElementById('avatarCircle');
    if (circle) {
        const namePart = (cached.nombre || cached.first_name || cached.username || "V")[0].toUpperCase();
        circle.textContent = namePart;
    }

    // 1. CARGA DESDE BACKEND (Para actualizar si hay algo nuevo)
    try {
        const res = await fetch(API_PROFILE, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const d = await res.json();
            
            // SOLO SOBRESCRIBIR SI EL DATO DEL BACKEND NO ES VACÍO
            // Esto evita que "borremos" el nombre de Viviana si el backend devuelve "" por error
            const updateIfBetter = (id, newVal) => {
                const el = document.getElementById(id);
                if (el && newVal && newVal.trim() !== "") el.value = newVal;
            };

            updateIfBetter('nombre',    d.nombre);
            updateIfBetter('apellido',  d.apellido);
            updateIfBetter('email',     d.email);
            updateIfBetter('telefono',  d.telefono);
            updateIfBetter('pais',      d.pais);
            updateIfBetter('ciudad',    d.ciudad);
            updateIfBetter('direccion', d.direccion);
            updateIfBetter('instagram', d.instagram);

            if(d.avatar) {
                circle.innerHTML = `<img src="${d.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }
            
            // Guardar lo más reciente en caché
            localStorage.setItem('user_data', JSON.stringify({ ...cached, ...d }));
        }
    } catch (err) { console.warn("Fallo carga perfil."); }
}

function setupAvatar() {
    const input = document.getElementById("avatarInput");
    const circle = document.getElementById("avatarCircle");
    input?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                circle.innerHTML = `<img src="${re.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                showToast("✅ ¡Previsualización lista! No olvides Guardar.");
            };
            reader.readAsDataURL(file);
        }
    });
}

function setupForm() {
    const form = document.getElementById("profileForm");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const payload = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            telefono: document.getElementById('telefono').value,
            pais: document.getElementById('pais').value,
            ciudad: document.getElementById('ciudad').value,
            direccion: document.getElementById('direccion').value,
            instagram: document.getElementById('instagram').value
        };

        try {
            const res = await fetch(API_PROFILE, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newData = await res.json();
                const oldData = JSON.parse(localStorage.getItem('user_data') || '{}');
                localStorage.setItem('user_data', JSON.stringify({...oldData, ...newData}));
                showToast("✅ ¡Perfil guardado con éxito! 💎");
            } else {
                const err = await res.json();
                console.error("Error backend:", err);
                showToast("❌ No se pudo guardar. Revisa los datos.", true);
            }
        } catch (err) { showToast("❌ Error de comunicación.", true); }
    });
}

function updateBadge() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

function showToast(msg, isErr = false) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        t.style = "position:fixed; top:100px; right:30px; background:var(--primary); color:white; padding:15px 30px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9999; font-weight:700; transition:all 0.4s ease; transform:translateX(200%);";
        document.body.appendChild(t);
    }
    t.style.background = isErr ? "#ef4444" : "var(--primary)";
    t.textContent = msg; t.style.transform = "translateX(0)";
    setTimeout(() => t.style.transform = "translateX(200%)", 3000);
}
