sed -i '/ev-attachments/d' public/js/events/events.modal.js
sed -i '/_pendingFiles = \[\]/d' public/js/events/events.modal.js
sed -i '/_pendingFiles.map(f => ({ name: f.name, size: f.size }))/d' public/js/events/events.modal.js
sed -i '/ev-file-list/d' public/js/events/events.modal.js
sed -i '/<label>Anexos<\/label>/d' public/js/events/events.modal.js
sed -i '/attachments:    data.attachments || \[\]/d' public/js/events/events.firestore.js
sed -i '/ev.attachments?.length ? `<span class="ep-tag">📎 ${ev.attachments.length}<\/span>` : '\'''\''/d' public/js/events/events.panel.js
sed -i '/function handleFileSelect(e)/,/^}/d' public/js/events/events.modal.js
