function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('aricat', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('posts', { keyPath: 'id' });
      r.result.createObjectStore('fonts', { keyPath: 'name' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const q = fn(t.objectStore(store));
    t.oncomplete = () => res(q && q.result);
    t.onerror = () => rej(t.error);
  });
}
const DB = {
  put: (s, v) => tx(s, 'readwrite', o => o.put(v)),
  del: (s, k) => tx(s, 'readwrite', o => o.delete(k)),
  all: s => tx(s, 'readonly', o => o.getAll()),
};
