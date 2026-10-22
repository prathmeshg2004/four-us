// ============================================================
// Script: Fetch and Display Access Logs for Four Us
// Usage: node scripts/get-logs.mjs
// ============================================================

const API_KEY = 'AIzaSyAollOMm9B6-QPzBMIKpgRh0W6nfvTh4_o';
const PROJECT_ID = 'four-us-22915';
const ROOM_ID = 'four-us-pv';

async function fetchLogs() {
  console.log('\n🔍 Connecting to Firebase Firestore...');

  // 1. Authenticate anonymously
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );

  if (!authRes.ok) {
    console.error('Authentication failed:', await authRes.text());
    return;
  }

  const { idToken } = await authRes.json();
  const headers = { Authorization: `Bearer ${idToken}` };

  console.log('✅ Authenticated successfully.\n');

  // 2. Query Prathmesh and Vidhi members documents
  for (const player of ['prathmesh', 'vidhi']) {
    const displayName = player === 'vidhi' ? '🌸 Vidhi' : '🦁 Prathmesh';
    console.log(`=======================================================`);
    console.log(`👤 ${displayName}`);
    console.log(`=======================================================`);

    const memberRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/rooms/${ROOM_ID}/members/${player}`,
      { headers }
    );

    if (!memberRes.ok) {
      console.log(`No records found for ${displayName}.\n`);
      continue;
    }

    const memberDoc = await memberRes.json();
    const fields = memberDoc.fields || {};

    const lastIp = fields.lastIp?.stringValue || 'Not recorded yet';
    const lastCity = fields.lastCity?.stringValue || 'Unknown';
    const lastIsp = fields.lastIsp?.stringValue || 'Unknown';
    const lastAccessTime = fields.lastAccessTime?.stringValue || fields.lastSeen?.stringValue || 'Unknown';
    const lastDevice = fields.lastDevice?.stringValue || 'Unknown';

    console.log(`📍 Latest IP:       ${lastIp}`);
    console.log(`🏙️  Location:        ${lastCity}`);
    console.log(`🌐 Network (ISP):   ${lastIsp}`);
    console.log(`🕒 Last Access:     ${lastAccessTime}`);
    console.log(`📱 Device:          ${lastDevice.substring(0, 80)}...`);

    const history = fields.accessHistory?.arrayValue?.values || [];
    if (history.length > 0) {
      console.log(`\n📜 Recent Login History (${history.length} events):`);
      history.slice(-10).reverse().forEach((item, idx) => {
        const m = item.mapValue?.fields || {};
        const ip = m.ip?.stringValue || '?';
        const city = m.city?.stringValue || '?';
        const region = m.region?.stringValue || '';
        const time = m.timeIST?.stringValue || '?';
        const event = m.eventType?.stringValue || 'login';
        console.log(`   ${idx + 1}. [${time}] ${event.toUpperCase()} — IP: ${ip} (${city}${region ? ', ' + region : ''})`);
      });
    } else {
      console.log('\n📜 No previous history entries yet (will record on next login).');
    }
    console.log('');
  }
}

fetchLogs().catch(console.error);
