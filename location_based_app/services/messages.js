// Message service abstraction

export const getMessageService = () => {
  const { hasFirebase } = require('./firebase');
  
  if (hasFirebase) {
    return require('./messages.firestore').service;
  } else {
    return require('./messages.memory').service;
  }
};


