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
let telegramUserId = null;

const DAILY_TASK_LIMIT = 40;
const AD_REWARD = 0.002;
const WITHDRAWAL_MINIMUMS = {
    binance: 0.3,
    trc20: 5,
    ton: 7
};

// --- [CORE APP LOGIC] ---
async function startApp(tgUser) {
    if (tgUser) {
        // LIVE MODE: RUNNING INSIDE TELEGRAM
        telegramUserId = tgUser.id.toString();
        console.log(`LIVE MODE DETECTED: Running in Telegram for user: ${tgUser.first_name} (ID: ${telegramUserId})`);
        
        const userRef = db.collection('users').doc(telegramUserId);
        const doc = await userRef.get();

        if (!doc.exists) {
            console.log('New Telegram user detected. Creating account...');
            const newUserState = {
                username: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
                telegramUsername: `@${tgUser.username || tgUser.id}`,
                profilePicUrl: generatePlaceholderAvatar(telegramUserId),
                balance: 0.0, tasksCompletedToday: 0, lastTaskTimestamp: null,
                totalEarned: 0, totalAdsViewed: 0, totalRefers: 0, joinedBonusTasks: []
            };
            await userRef.set(newUserState);
            userState = newUserState;
        } else {
            console.log('Returning user. Loading data from Firebase...');
            userState = doc.data();
            let updates = {};
            if (!userState.profilePicUrl) updates.profilePicUrl = generatePlaceholderAvatar(telegramUserId);
            const currentName = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
            if (userState.username !== currentName) updates.username = currentName;
            if(Object.keys(updates).length > 0) {
                await userRef.update(updates);
                userState = {...userState, ...updates};
            }
            if (userState.lastTaskTimestamp) {
                const now = new Date();
                const lastTaskDate = userState.lastTaskTimestamp.toDate();
                if (now.getUTCDate() > lastTaskDate.getUTCDate() || now.getUTCMonth() > lastTaskDate.getUTCMonth()) {
                    userState.tasksCompletedToday = 0;
                    await userRef.update({ tasksCompletedToday: 0 });
                }
            }
        }
    } else {
        // FALLBACK/TESTING MODE: Not running in Telegram
        console.warn("TESTING MODE: Not running in Telegram. Using a fake user ID.");
        telegramUserId = getFakeUserIdForTesting();
        const userRef = db.collection('users').doc(telegramUserId);
        const doc = await userRef.get();
        if (!doc.exists) {
            const fakeUserState = { username: "Test User", telegramUsername: `@testuser`, profilePicUrl: generatePlaceholderAvatar(telegramUserId), balance: 0.0, tasksCompletedToday: 0, lastTaskTimestamp: null, totalEarned: 0, totalAdsViewed: 0, totalRefers: 0, joinedBonusTasks: [] };
            await userRef.set(fakeUserState);
            userState = fakeUserState;
        } else {
            userState = doc.data();
        }
    }
    updateUI();
}

function generatePlaceholderAvatar(userId) { return `https://i.pravatar.cc/150?u=${userId}`; }
function getFakeUserIdForTesting() {
    if (localStorage.getItem('fakeTelegramId')) return localStorage.getItem('fakeTelegramId');
    const fakeId = 'test_user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('fakeTelegramId', fakeId);
    return fakeId;
}

function updateUI() {
    document.querySelectorAll('.profile-pic, .profile-pic-large').forEach(img => { if (userState.profilePicUrl) img.src = userState.profilePicUrl; });
    const balanceString = userState.balance.toFixed(3);
    const totalEarnedString = userState.totalEarned.toFixed(3);
    document.getElementById('balance-home').textContent = balanceString;
    document.getElementById('withdraw-balance').textContent = balanceString;
    document.getElementById('profile-balance').textContent = balanceString;
    document.getElementById('home-username').textContent = userState.username;
    document.getElementById('profile-name').textContent = userState.username;
    document.getElementById('telegram-username').textContent = userState.telegramUsername;
    document.getElementById('ads-watched-today').textContent = userState.tasksCompletedToday;
    document.getElementById('ads-left-today').textContent = DAILY_TASK_LIMIT - userState.tasksCompletedToday;
    const tasksCompleted = userState.tasksCompletedToday;
    document.getElementById('tasks-completed').textContent = `${tasksCompleted} / ${DAILY_TASK_LIMIT}`;
    const progressPercentage = (tasksCompleted / DAILY_TASK_LIMIT) * 100;
    document.getElementById('task-progress-bar').style.width = `${progressPercentage}%`;
    const taskButton = document.getElementById('start-task-button');
    taskButton.disabled = tasksCompleted >= DAILY_TASK_LIMIT;
    taskButton.innerHTML = tasksCompleted >= DAILY_TASK_LIMIT ? '<i class="fas fa-check-circle"></i> All tasks done' : '<i class="fas fa-play-circle"></i> Watch Ad';
    document.getElementById('earned-so-far').textContent = totalEarnedString;
    document.getElementById('total-ads-viewed').textContent = userState.totalAdsViewed;
    document.getElementById('total-refers').textContent = userState.totalRefers;
    userState.joinedBonusTasks.forEach(taskId => {
        const taskCard = document.getElementById(`task-${taskId}`);
        if (taskCard) taskCard.classList.add('completed');
    });
}

// --- [USER ACTIONS] ---
window.completeAdTask = async function() { if (userState.tasksCompletedToday >= DAILY_TASK_LIMIT) { alert("You have completed all ad tasks for today!"); return; } const taskButton = document.getElementById('start-task-button'); try { taskButton.disabled = true; taskButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Ad...'; await window.show_9685198(); const userRef = db.collection('users').doc(telegramUserId); await userRef.update({ balance: firebase.firestore.FieldValue.increment(AD_REWARD), totalEarned: firebase.firestore.FieldValue.increment(AD_REWARD), tasksCompletedToday: firebase.firestore.FieldValue.increment(1), totalAdsViewed: firebase.firestore.FieldValue.increment(1), lastTaskTimestamp: firebase.firestore.FieldValue.serverTimestamp() }); userState.balance += AD_REWARD; userState.totalEarned += AD_REWARD; userState.tasksCompletedToday++; userState.totalAdsViewed++; alert("Success! $0.002 has been added to your balance."); } catch (error) { console.error("An error occurred during the ad task:", error); alert("Ad could not be shown or was closed early. Please try again."); } finally { updateUI(); } }
window.verifyJoin = async function(taskId, reward) { if (userState.joinedBonusTasks.includes(taskId)) { alert("You have already completed this task."); return; } const verifyButton = document.querySelector(`#task-${taskId} .verify-btn`); verifyButton.disabled = true; verifyButton.textContent = "Verifying..."; const hasJoined = confirm("Please confirm that you have joined the Telegram channel. We will verify this. False claims may lead to a ban."); if (hasJoined) { try { const userRef = db.collection('users').doc(telegramUserId); await userRef.update({ balance: firebase.firestore.FieldValue.increment(reward), totalEarned: firebase.firestore.FieldValue.increment(reward), joinedBonusTasks: firebase.firestore.FieldValue.arrayUnion(taskId) }); userState.balance += reward; userState.totalEarned += reward; userState.joinedBonusTasks.push(taskId); alert(`Verification successful! You've earned a bonus of $${reward}.`); updateUI(); } catch (error) { console.error("Error rewarding user for channel join:", error); alert("An error occurred. Please try again."); verifyButton.disabled = false; verifyButton.textContent = "Verify"; } } else { alert("Verification cancelled. Please join the channel and then click 'Verify' to claim your reward."); verifyButton.disabled = false; verifyButton.textContent = "Verify"; } }
window.submitWithdrawal = async function() { const amount = parseFloat(document.getElementById('withdraw-amount').value); const method = document.getElementById('withdraw-method').value; const walletId = document.getElementById('wallet-id').value.trim(); const minAmount = WITHDRAWAL_MINIMUMS[method]; if (isNaN(amount) || amount <= 0 || !walletId) { alert('Please enter a valid amount and wallet ID.'); return; } if (amount < minAmount) { alert(`Withdrawal failed. The minimum for ${method.toUpperCase()} is $${minAmount}.`); return; } if (amount > userState.balance) { alert('Withdrawal failed. You do not have enough balance.'); return; } await db.collection('withdrawals').add({ userId: telegramUserId, username: userState.telegramUsername, amount: amount, method: method, walletId: walletId, status: "pending", requestedAt: firebase.firestore.FieldValue.serverTimestamp() }); const userRef = db.collection('users').doc(telegramUserId); await userRef.update({ balance: firebase.firestore.FieldValue.increment(-amount) }); alert(`Success! Your withdrawal request for $${amount.toFixed(3)} has been submitted.`); userState.balance -= amount; document.getElementById('withdraw-amount').value = ''; document.getElementById('wallet-id').value = ''; updateUI(); }

// --- [UTILITY FUNCTIONS] ---
window.openTelegramLink = function(url) { window.open(url, '_blank'); }
window.showTab = function(tabName, element) { document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById(tabName).classList.add('active'); document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); element.classList.add('active'); }
window.openReferModal = function() { document.getElementById('refer-modal').style.display = 'flex'; }
window.closeReferModal = function() { document.getElementById('refer-modal').style.display = 'none'; }
window.copyReferralLink = function(button) { const linkInput = document.getElementById('referral-link'); navigator.clipboard.writeText(linkInput.value).then(() => { const originalIcon = button.innerHTML; button.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { button.innerHTML = originalIcon; }, 1500); }).catch(err => console.error('Failed to copy text: ', err)); }
window.onclick = function(event) { if (event.target == document.getElementById('refer-modal')) { closeReferModal(); } }

// --- [APP ENTRY POINT] ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        Telegram.WebApp.ready();
        startApp(window.Telegram.WebApp.initDataUnsafe.user);
    } else {
        console.error("CRITICAL: Telegram user data not found. Starting in TEST mode.");
        startApp(null);
    }
});
