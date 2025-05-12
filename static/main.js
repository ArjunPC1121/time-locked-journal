// Authentication
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "/journal";
        })
        .catch(error => {
            document.getElementById('auth-message').innerText = error.message;
        });
}

function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "/journal";
        })
        .catch(error => {
            document.getElementById('auth-message').innerText = error.message;
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login";
    });
}

// Write a message
function writeMessage() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const message = document.getElementById('message').value;
    const unlockTime = document.getElementById('unlock_time').value;
    if (!message || !unlockTime) {
        document.getElementById('write-message-status').innerText = "Please enter message and unlock time.";
        return;
    }
    const unlockDate = new Date(unlockTime);
    if (isNaN(unlockDate.getTime())) {
        document.getElementById('write-message-status').innerText = "Invalid unlock date/time.";
        return;
    }
    firebase.firestore().collection("messages").add({
        user_id: user.uid,
        message: message,
        unlock_time: firebase.firestore.Timestamp.fromDate(unlockDate),
        created_at: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        document.getElementById('write-message-status').innerText = "Message saved!";
        document.getElementById('message').value = "";
        document.getElementById('unlock_time').value = "";
        fetchMessages();
    })
    .catch(error => {
        document.getElementById('write-message-status').innerText = error.message;
    });
}

// Delete a single message by document ID
function deleteMessage(docId) {
    firebase.firestore().collection("messages").doc(docId).delete()
        .then(() => {
            fetchMessages();
        })
        .catch(error => {
            alert("Error deleting message: " + error.message);
        });
}

// Delete all unlocked messages for the current user
function clearAllReadMessages() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    if (!confirm("Are you sure you want to delete all read messages? This cannot be undone.")) return;

    firebase.firestore().collection("messages")
        .where("user_id", "==", user.uid)
        .orderBy("unlock_time")
        .get()
        .then(querySnapshot => {
            const now = new Date();
            const batch = firebase.firestore().batch();
            let count = 0;
            querySnapshot.forEach(doc => {
                const data = doc.data();
                let unlockDate;
                if (data.unlock_time && typeof data.unlock_time.toDate === "function") {
                    unlockDate = data.unlock_time.toDate();
                } else if (typeof data.unlock_time === "string" || typeof data.unlock_time === "number") {
                    unlockDate = new Date(data.unlock_time);
                }
                if (unlockDate && unlockDate <= now) {
                    batch.delete(doc.ref);
                    count++;
                }
            });
            if (count === 0) {
                alert("No read messages to delete.");
                return;
            }
            batch.commit().then(() => {
                fetchMessages();
            });
        })
        .catch(error => {
            alert("Error clearing messages: " + error.message);
        });
}

// Fetch and display messages
function fetchMessages() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection("messages")
        .where("user_id", "==", user.uid)
        .orderBy("unlock_time")
        .get()
        .then(querySnapshot => {
            const messagesList = document.getElementById('messages-list');
            messagesList.innerHTML = "";
            const now = new Date();
            if (querySnapshot.empty) {
                messagesList.innerHTML = "<li>No messages found.</li>";
                return;
            }
            querySnapshot.forEach(doc => {
                const data = doc.data();
                let unlockDate;
                if (data.unlock_time && typeof data.unlock_time.toDate === "function") {
                    unlockDate = data.unlock_time.toDate();
                } else if (typeof data.unlock_time === "string" || typeof data.unlock_time === "number") {
                    unlockDate = new Date(data.unlock_time);
                } else {
                    unlockDate = null;
                }

                const li = document.createElement('li');
                if (!unlockDate || isNaN(unlockDate.getTime())) {
                    li.className = "locked";
                    li.innerHTML = `<div class="message-content"><div><b>Error:</b> Invalid unlock time for this message.</div></div>`;
                } else if (unlockDate > now) {
                    li.className = "locked";
                    li.innerHTML = `<div class="message-content"><div><b>Locked until:</b> ${unlockDate.toLocaleString()} <br> <i>(Message is locked)</i></div></div>`;
                } else {
                    li.className = "unlocked";
                    li.innerHTML = `
                        <div class="message-content">
                            <div>
                                <b>Unlocked at:</b> ${unlockDate.toLocaleString()} <br>
                                <b>Message:</b> ${data.message}
                            </div>
                            <button class="delete-btn" onclick="deleteMessage('${doc.id}')">Delete</button>
                        </div>
                    `;
                }
                messagesList.appendChild(li);
            });
        })
        .catch(error => {
            const messagesList = document.getElementById('messages-list');
            messagesList.innerHTML = `<li>Error loading messages: ${error.message}</li>`;
        });
}
