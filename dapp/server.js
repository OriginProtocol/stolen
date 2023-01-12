require('dotenv').config();

const express = require('express');
const apicache = require('apicache');

const app = express();

const { TwitterApi } = require('twitter-api-v2');

const cache = apicache.middleware;

const twitterClient = new TwitterApi(process.env.TWITTER_TOKEN);
const readOnlyClient = twitterClient.readOnly;

app.set('port', process.env.PORT || 4000);

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
}

app.get('/api/twitter', cache('10 minutes'), async (req, res) => {
  const { id, username } = req.query;

  if (id) {
    return res.json(
      await readOnlyClient.v2.user(
        id, { 'user.fields': 'profile_image_url' }
      )
    );
  }

  if (username) {
    return res.json(
      await readOnlyClient.v2.userByUsername(
        username, { 'user.fields': 'profile_image_url' }
      )
    );
  }

  res.status(204);
});

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});
