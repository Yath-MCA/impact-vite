import { createRoot } from 'react-dom/client';
import ReactApp from './ReactApp.jsx';

let root = null;

export function mountReactApp(el) {
  if (!el) throw new Error('mount element required');
  if (root) {
    root.unmount();
    root = null;
  }
  root = createRoot(el);
  root.render(<ReactApp />);
}

export function unmountReactApp() {
  if (root) {
    root.unmount();
    root = null;
  }
}
