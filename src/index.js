const ESTAFETA_SUPPORTED_SIGNALING = Object.freeze({
  XMPP: "xmpp",
  WEBSOCKET: "websocket"
});

class Estafeta {
  constructor(configuration = null) {
    console.log("constructor estafeta", configuration);

    this.signalingConfiguration = configuration;
    this.me = "0";

    this.uuids = {
      "1": {
        type: "xmpp",
        send: xmppMessage => console.log("xmmp send message", xmppMessage)
      },
      "2": {
        type: "websocket",
        send: websocketMessage =>
          console.log("websocket send message", websocketMessage)
      },
      "3": {
        type: "websocket",
        send: websocketMessage =>
          console.log("websocket send message", websocketMessage)
      }
    };

    this[ESTAFETA_SUPPORTED_SIGNALING.XMPP] = {
      parsers: [],
      translators: []
    };
    this[ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET] = {
      parsers: [],
      translators: []
    };

    this.signalingConfiguration &&
      Object.keys(this.signalingConfiguration).forEach(signaling => {
        switch (signaling) {
          case ESTAFETA_SUPPORTED_SIGNALING.XMPP:
            this.initializeXmpp(this.signalingConfiguration[signaling]);
            break;
          case ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET:
            this.initializeWebsocket(this.signalingConfiguration[signaling]);
            break;
          default:
            throw "signaling-method-not-supported";
            break;
        }
      });
  }

  initializeXmpp(configuration) {
    console.log("initializeXmpp", { configuration });
    // Adding fixed backend jid by configuration
    this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].backendJid =
      configuration.backendJid;
    this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].connection = {
      type: ESTAFETA_SUPPORTED_SIGNALING.XMPP,
      send: xmppMessage => console.log("xmmp send message", xmppMessage)
    };
    // TODO
  }
  initializeWebsocket(configuration) {
    console.log("initializeWebsocket", { configuration });
    this[ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET].connection = {
      type: ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET,
      send: websocketMessage =>
        console.log("websocket send message", websocketMessage)
    };
    // TODO
  }

  // Add a new parser to a specific signaling method to estafeta object
  addXmppParser(parser) {
    this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].parsers.push(parser);
  }

  // Add a new translator from estafeta object to especific signaling method
  addXmppTranslator(translator) {
    this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].translators.push(translator);
  }

  // Add a new parser to a specific signaling method to estafeta object
  addWebsocketParser(parser) {
    this[ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET].parsers.push(parser);
  }

  // Add a new translator from estafeta object to especific signaling method
  addWebsocketTranslator(translator) {
    this[ESTAFETA_SUPPORTED_SIGNALING.WEBSOCKET].translators.push(translator);
  }

  send(estafetaPOJO) {
    // check if it is a valid estafetaPOJO
    if (!estafetaPOJO.from || !estafetaPOJO.to || !estafetaPOJO.target) {
      throw "no-valid-estafeta-message";
    }

    const uid = estafetaPOJO.target;

    const connection = this._getConnectionFromUid(uid);

    if (!connection) {
      throw "no-uid-connection-found";
    }

    // It is needed to translate estafetaPOJO to a valid signaling message
    const signalingMessage = this._translateMessage(
      estafetaPOJO,
      connection.type
    );

    signalingMessage && connection.send(signalingMessage);
  }

  // Callback to be notified when a message is received in xmpp
  receivedXmppMessage(signalingMessage) {
    console.log("Received xmpp message", signalingMessage);
    const estafetaPOJO = this._parseMessage(
      signalingMessage,
      ESTAFETA_SUPPORTED_SIGNALING.XMPP
    );

    // Is not a valid message so discard
    if (!estafetaPOJO) {
      return;
    }

    // Should the message be routed?
    if (estafetaPOJO.to !== estafetaPOJO.target) {
      this._routeMessage(estafetaPOJO);
    } else if (estafetaPOJO.to === this.me) {
      // The message is for me
      // notify application layer about the message received estafetaPOJO
    } else {
      // this case never could be reached
    }
  }
  // Callback to be notified when a message is received in websocket
  receivedWebsocketMessage(message) {}

  _routeMessage(estafetaPOJO) {
    console.log("Routing message", estafetaPOJO);
    // the message just need to be send
    estafetaPOJO.to = estafetaPOJO.target;
    this.send(estafetaPOJO, estafetaPOJO.target);
  }

  _getConnectionFromUid(uid) {
    return uid === this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].backendJid
      ? this[ESTAFETA_SUPPORTED_SIGNALING.XMPP].connection
      : this.uuids[uid]
        ? this.uuids[uid]
        : null;
  }

  _translateMessage(estafetaPOJO, connectionType) {
    let signalingMessage = null;

    for (let i = 0; i < this[connectionType].translators.length; ++i) {
      signalingMessage = this[connectionType].translators[i](estafetaPOJO);

      if (signalingMessage) {
        break;
      }
    }
    return signalingMessage;
  }

  _parseMessage(signalingMessage, connectionType) {
    let estafetaPOJO = null;

    for (let i = 0; i < this[connectionType].parsers.length; ++i) {
      estafetaPOJO = this[connectionType].parsers[i](signalingMessage);

      // Check that the parser returns a valid estafeta POJO
      if (
        estafetaPOJO &&
        estafetaPOJO.from &&
        estafetaPOJO.to &&
        estafetaPOJO.target
      ) {
        break;
      }
    }
    return estafetaPOJO;
  }
}

// APP CODE

console.log("START");
const EstafetaSignaling = new Estafeta({
  xmpp: {
    backendJid: "backend"
  },
  websocket: {
    nothing: ""
  }
});

EstafetaSignaling.addXmppParser(message => {
  console.log("xmpp => estafeta");
  return {
    from: message.from,
    to: message.to,
    target: message.target,
    data: {}
  };
});

EstafetaSignaling.addXmppTranslator(message => {
  console.log("estafeta => xmpp");
  return {
    from: message.from,
    to: message.to,
    target: message.target,
    data: {}
  };
});

EstafetaSignaling.addWebsocketParser(message => {
  console.log("websocket => estafeta");
  return {
    from: message.from,
    to: message.to,
    target: message.target,
    data: {}
  };
});

EstafetaSignaling.addWebsocketTranslator(message => {
  console.log("estafeta => websocket");
  return {
    from: message.from,
    to: message.to,
    target: message.target,
    data: {}
  };
});

EstafetaSignaling.send({
  from: "1",
  to: "2",
  target: "1",
  data: {}
});

EstafetaSignaling.receivedXmppMessage({
  from: "1",
  to: "2",
  target: "3",
  data: {}
});
