import $ from 'jquery';
window.$ = $;
window.jQuery = $; // make jQuery globally available
jQuery = $;


import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap'; // uses @popperjs/core

// import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/themes/base/all.css';


import moment from 'moment';
import Swal from 'sweetalert2';

import { store, setContent } from './middleware/redux/store.js';


// Simple SPA loader
async function loadPage(path) {
    const res = await fetch(`/src/pages/${path}/index.html`);
    const html = await res.text();
    document.getElementById('app').innerHTML = html;
}

// Initial load
loadPage('home');

// Example: show SweetAlert with current time
Swal.fire({
    title: 'Welcome to Impact',
    text: `Loaded at ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
    icon: 'success'
});

// Redux subscription (global)
store.subscribe(() => {
    const state = store.getState();
    const editor = document.querySelector('.editor');
    if (editor) {
        editor.textContent = state.panel.content;
    }
});