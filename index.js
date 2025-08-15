const mineflayer = require('mineflayer');
const express = require('express');
const settings = require('./settings.json');

const app = express();
const port = process.env.PORT || 3000;

function createBot(username) {
  const bot = mineflayer.createBot({
    host: settings.serverIP,
    port: settings.serverPort,
    username: username,
    version: settings.version
  });

  let lastActionTime = Date.now();

  bot.once('spawn', () => {
    console.log(`✅ ${bot.username} spawned`);

    // Send join message immediately
    bot.chat(settings.joinMessage);

    // Main walk loop
    setInterval(() => {
      if (!bot.entity || !bot.entity.position) return;

      // Chat before walking
      bot.chat(settings.walkMessage);
      lastActionTime = Date.now();

      // Walk forward ~5 blocks
      bot.setControlState('forward', true);
      setTimeout(() => {
        bot.setControlState('forward', false);

        // Turn 180 degrees
        bot.look(bot.entity.yaw + Math.PI, 0, true);

        // Jump multiple times
        jumpMultipleTimes(bot, settings.jumpCount);
      }, 2000);
    }, settings.intervalSeconds * 1000);

    // AFK detection (idle for 5 minutes)
    setInterval(() => {
      if (Date.now() - lastActionTime >= 5 * 60 * 1000) {
        console.log(`${bot.username} is AFK, jumping twice`);
        jumpMultipleTimes(bot, 2);
        lastActionTime = Date.now();
      }
    }, 10000);
  });

  bot.on('end', () => {
    console.log(`❌ ${bot.username} disconnected. Reconnecting...`);
    setTimeout(() => createBot(username), 5000); // reconnect in 5 sec
  });

  bot.on('error', (err) => {
    console.log(`⚠️ ${bot.username} error: ${err.message}`);
  });

  return bot;
}

// Helper: Jump multiple times
function jumpMultipleTimes(bot, count) {
  let jumpsDone = 0;
  const jumpInterval = setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 200);
    jumpsDone++;
    if (jumpsDone >= count) clearInterval(jumpInterval);
  }, 500);
}

// Join bots after 5 seconds
settings.botNames.forEach(name => {
  setTimeout(() => createBot(name), 5000);
});

// Express web server for uptime check
app.get('/', (req, res) => {
  res.send(`🟢 Bots online: ${settings.botNames.join(', ')}`);
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(port, () => {
  console.log(`🌐 Web server running at http://localhost:${port}`);
});
