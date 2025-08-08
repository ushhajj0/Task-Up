// --- [DATABASE & APP INITIALIZATION] ---

// YOUR PERSONAL FIREBASE CONFIGURATION IS NOW INCLUDED
const firebaseConfig = {
  apiKey: "AIzaSyB1TYSc2keBepN_cMV9oaoHFRdcJaAqG_g",
  authDomain: "taskup-9ba7b.firebaseapp.com",
  projectId: "taskup-9ba7b",
  storageBucket: "taskup-9ba7b.appspot.com",
  messagingSenderId: "319481101196",
  appId: "1:319481101196:web:6cded5be97620d98d974a9",
  measurementId: "G-JNNLG1E49L"
};

// Initialize Firebase using the compat libraries
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- [GLOBAL STATE & CONSTANTS] ---
let userState = {};
let localUserId = null; // This will be our new unique ID

const DAILY_TASK_LIMIT = 40;
const AD_REWARD = 0.002;
const WITHDRAWAL_MINIMUMS = {
    binance: 0.3,
    trc20: 5,
    ton: 7
};

// --- [CORE APP LOGIC - NEW SIMPLIFIED VERSION] ---

// This function is now called directly from the body tag
window.initializeApp = async function() {
    // 1. Get or create a unique ID for this device.
    localUserId = getLocalUserId();
    console.log(`Initializing app for User ID: ${localUserId}`);

    const userRef = db.collection('users').doc(localUserId);
    const doc = await userRef.get();

    if (!doc.exists) {
        // 2. If the user is new, create a simple account for them.
        console.log('New user detected. Creating default account...');
        const newUserState = {
            username: "User", // Every new user is named "User"
            telegramUsername: `@${localUserId}`, // Use the local ID as a placeholder
            profilePicUrl: generatePlaceholderAvatar(localUserId), // Generate unique avatar
            balance: 0.0,
            tasksCompletedToday: 0,
            lastTaskTimestamp: null,
            totalEarned: 0,
            totalAdsViewed: 0,
            totalRefers: 0,
            joinedBonusTasks: []
        };
        await userRef.set(newUserState);
        userState = newUserState;
    } else {
        // 3. If the user is returning, load their data.
        console.log('Returning user. Loading data from Firebase...');
        userState = doc.data();
        
        // Perform the 24-hour task reset check
        if (userState.lastTaskTimestamp) {
            const now = new Date();
            const lastTaskDate = userState.lastTaskTimestamp.toDate();
            if (now.getUTCDate() > lastTaskDate.getUTCDate() || now.getUTCMonth() > lastTaskDate.getUTCMonth()) {
                userState.tasksCompletedToday = 0;
                await userRef.update({ tasksCompletedToday: 0 });
            }
        }
    }
    
    // Finally, update the UI
    updateUI();
}

/**
 * Checks for a user ID in the browser's local storage.
 * If one doesn't exist, it creates a new random ID and saves it.
 * This ensures the same device is recognized as the same user.
 */
function getLocalUserId() {
    let storedId = localStorage.getItem('localAppUserId');
    if (storedId) {
        return storedId;
    }
    // Create a new random ID if one is not found
    const newId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('localAppUserId', newId);
    return newId;
}

function generatePlaceholderAvatar(userId) {
    return `https://i.pravatar.cc/150?u=${userId}`;
}

function updateUI() {
    document.querySelectorAll('.profile-pic, .profile-pic-large').forEach(img => { if (userState.profilePicUrl) img.src = userState.profilePicUrl; });
    const balanceString = userState.balance.toFixed(3);
    const totalEarnedString = userState.totalEarned.toFixed(3);
    document.getElementById('balance-home').textContent = balanceString;
    document.getElementById('withdraw-balance').textContent = balanceString;
    document.getElementById('profile-balance').textContent = balanceString;
    document.getElementById('home-username').textContent = userState.username; // This will now always be "User" for new accounts
    document.getElementById('profile-name').textContent = userState.username; // This will now always be "User" for new accounts
    document.getElementById('telegram-username').textContent = userState.telegramUsername;
    document.getElementById('ads-watched-today').textContent = user_state.tasksCompletedToday;
    document.getElementById('ads-left-today').textContent = DAILY_TASK_LIMIT - user_state.tasksCompletedToday;
    const tasksCompleted = user_state.tasksCompletedToday;
    document.getElementById('tasks-completed').textContent = `${tasksCompleted} / ${DAILY_TASK_LIMIT}`;
    const progressPercentage = (tasksCompleted / DAILY_TASK_LIMIT) * 100;
    document.getElementById('task-progress-bar').style.width = `${progressPercentage}%`;
    const taskButton = document.getElementById('start-task-button');
    taskButton.disabled = tasksCompleted >= DAILY_TASK_LIMIT;
    taskButton.innerHTML = tasksCompleted >= DAILY_TASK_LIMIT ? '<i class="fas fa-check-circle"></i> All tasks done' : '<i class="fas fa-play-circle"></i> Watch Ad';
    document.getElementById('earned-so-far').textContent = totalEarnedString;
    document.getElementById('total-ads-viewed').textContent = user_state.totalAdsViewed;
    document.getElementById('total-refers').textContent = user_state.totalRefers;
    user_state.joinedBonusTasks.forEach(taskId => {
        const taskCard = document.getElementById(`task-${taskId}`);
        if (taskCard) taskCard.classList.add('completed');
    });
}


// --- [USER ACTIONS] ---
// These are now much simpler as they just use the `localUserId`
window.completeAdTask = async function() {
    if (userState.tasksCompletedToday >= DAILY_TASK_LIMIT) { alert("You have completed all ad tasks for today!"); return; }
    const taskButton = document.getElementById('start-task-button');
    try {
        taskButton.disabled = true;
        taskButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Ad...';
        await window.show_9685198();
        const userRef = db.collection('users').doc(localUserId);
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(AD_REWARD),
            totalEarned: firebase.firestore.FieldValue.increment(AD_REWARD),
            tasksCompletedToday: firebase.firestore.FieldValue.increment(1),
            totalAdsViewed: firebase.firestore.FieldValue.increment(1),
            lastTaskTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        userState.balance += AD_REWARD;
        userState.totalEarned += AD_REWARD;
        userState.tasksCompletedToday++;
        userState.totalAdsViewed++;
        alert("Success! $0.002 has been added to your balance.");
    } catch (error) {
        console.error("An error occurred during the ad task:", error);
        alert("Ad could not be shown or was closed early. Please try again.");
    } finally {
        updateUI();
    }
}

window.verifyJoin = async function(taskId, reward) {
    if (userState.joinedBonusTasks.includes(taskId)) { alert("You have already completed this task."); return; }
    const verifyButton = document.querySelector(`#task-${taskId} .verify-btn`);
    verifyButton.disabled = true;
    verifyButton.textContent = "Verifying...";
    const hasJoined = confirm("Please confirm that you have joined the Telegram channel. This action will be recorded.");
    if (hasJoined) {
        try {
            const userRef = db.collection('users').doc(localUserId);
            await userRef.update({
                balance: firebase.firestore.FieldValue.increment(reward),
                totalEarned: firebase.firestore.FieldValue.increment(reward),
                joinedBonusTasks: firebase.firestore.FieldValue.arrayUnion(taskId)
            });
            userState.balance += reward;
            userState.totalEarned += reward;
            userState.joinedBonusTasks.push(taskId);
            alert(`Verification successful! You've earned a bonus of $${reward}.`);
            updateUI();
        } catch (error) {
            console.error("Error rewarding user for channel join:", error);
            alert("An error occurred. Please try again.");
            verifyButton.disabled = false;
            verifyButton.textContent = "Verify";
        }
    } else {
        alert("Verification cancelled.");
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify";
    }
}

window.submitWithdrawal = async function() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    const walletId = document.getElementById('wallet-id').value.trim();
    const minAmount = WITHDRAWAL_MINIMUMS[method];
    if (isNaN(amount) || amount <= 0 || !walletId) { alert('Please enter a valid amount and wallet ID.'); return; }
    if (amount < minAmount) { alert(`Withdrawal failed. The minimum for ${method.toUpperCase()} is $${minAmount}.`); return; }
    if (amount > userState.balance) { alert('Withdrawal failed. You do not have enough balance.'); return; }
    await db.collection('withdrawals').add({
        userId: localUserId, // Use the local ID for withdrawal records
        username: userState.telegramUsername, // Keep this for your reference
        amount: amount,
        method: method,
        walletId: walletId,
        status: "pending",
        requestedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const userRef = db.collection('users').doc(localUserId);
    await userRef.update({ balance: firebase.firestore.FieldValue.increment(-amount) });
    alert(`Success! Your withdrawal request for $${amount.toFixed(3)} has been submitted.`);
    userState.balance -= amount;
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('wallet-id').value = '';
    updateUI();
}

// --- [UTILITY FUNCTIONS] ---
window.openTelegramLink = function(url) { window.open(url, '_blank'); }
window.showTab = function(tabName, element) { document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById(tabName).classList.add('active'); document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); element.classList.add('active'); }
window.openReferModal = function() { document.getElementById('refer-modal').style.display = 'flex'; }
window.closeReferModal = function() { document.getElementById('refer-modal').style.display = 'none'; }
window.copyReferralLink = function(button) { const linkInput = document.getElementById('referral-link'); navigator.clipboard.writeText(linkInput.value).then(() => { const originalIcon = button.innerHTML; button.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { button.innerHTML = originalIcon; }, 1500); }).catch(err => console.error('Failed to copy text: ', err)); }
window.onclick = function(event) { if (event.target == document.getElementById('refer-modal')) { closeReferModal(); } }
