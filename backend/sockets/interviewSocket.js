function registerInterviewSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-session', (sessionId) => {
      socket.join(`session-${sessionId}`);
    });

    socket.on('code-change', ({ sessionId, code, language }) => {
      socket.to(`session-${sessionId}`).emit('code-update', { code, language });
    });

    socket.on('typing', ({ sessionId, isTyping }) => {
      socket.to(`session-${sessionId}`).emit('typing-status', { sessionId, isTyping });
    });

    socket.on('proctor-event', ({ sessionId, eventType, details }) => {
      console.warn(`Proctoring alert [session ${sessionId}]: ${eventType}`, details);
      socket.to(`session-${sessionId}`).emit('proctor-alert', { sessionId, eventType, details, timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerInterviewSocket;