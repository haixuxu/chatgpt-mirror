import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import ChatgptService from './chatgpt.service.js';

const router = express.Router();
let chatgptsvc = null;

function setupSvc() {
  if (!chatgptsvc) {
    chatgptsvc = new ChatgptService();
  }
}

router.post('/moderations', function(req, res) {
  setupSvc();
  chatgptsvc.call('/moderations').then((ret) => {
    res.json({ blocked: false, flagged: false, moderation_id: uuidv4() });
  });
});

router.get('/conversations', function(req, res) {
  setupSvc();
  chatgptsvc.call('/conversations').then((ret) => {
    res.json({ items: [], total: 0, limit: 20, offset: 0 });
  });
});

router.post('/conversation', function(req, res) {
  setupSvc();
  const { messages, parent_message_id } = req.body;
  let message = messages && messages.length > 0 ? messages[0] : '';
  const parts = message.content.parts || [];
  message = parts.length > 0 ? parts[0] : '';
  const client = req.newSeeClient();
  chatgptsvc.sendMessage(message, parent_message_id, function(data) {
    client.send(data.type, data.data);
  });
});

router.post('/conversation/gen_title/', function(req, res) {
  res.json({ title: '' });
});

export default router;
