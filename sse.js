const uuidv4 = require("uuid").v4;

const seeclients = {};

module.exports = function (opts = {}) {

  return function (req, res, next) {
    req.newSeeClient = function () {
      req.socket.setTimeout(0);
      req.socket.setNoDelay(true);
      req.socket.setKeepAlive(true);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      if (req.httpVersion !== "2.0") {
        res.setHeader("Connection", "keep-alive");
      }
      res.flushHeaders();

      const clientId = uuidv4();
      const client = createClient(req, res);
      seeclients[clientId] = client;
      req.on("close", function () {
        delete seeclients[clientId];
      });
      return client;
    };

    next();
  };

  function createClient(request, response) {
    let id = 0;
    return {
      request,
      response,
      send: function (event, data, customId) {
        const eventId = customId || id;
        id++;
        sendEvent(response, { id: eventId, event, data });
        response.flush();
      },
    };
  }

  function sendEvent(res, { id, event, retry, data }) {
    res.write(`id: ${id}\n`);
    if (event) {
      res.write(`event: ${event}\n`);
    }
    if (retry) {
      res.write(`retry: ${retry}\n`);
    }
    if (typeof data === "string") {
      res.write(`data: ${data}\n`);
    } else {
      res.write(`data: ${JSON.stringify(data)}\n`);
    }
    res.write("\n"); // end;
  }
};
