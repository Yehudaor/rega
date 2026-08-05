import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// מסתירים את מסך הפתיחה אחרי שהאפליקציה מצוירת, עם מינימום זמן שלא יהבהב
const splash = document.getElementById('splash');
if (splash) {
  // setTimeout ולא requestAnimationFrame — rAF אינו נורה בלשונית מוסתרת
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }, 650);
}
