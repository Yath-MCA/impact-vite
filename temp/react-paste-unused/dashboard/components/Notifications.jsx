import { memo } from 'react';

function Notifications({ items }) {
  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Notifications</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <p className="font-medium text-gray-800">{item.title}</p>
            <p className="mt-0.5 text-gray-500">{item.message}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(Notifications);
