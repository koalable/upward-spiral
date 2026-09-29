// Check-in → Notifications tab.
import { state } from "../state.js";
import { setPath } from "../util.js";
import { render } from "../render.js";
import { notifyView } from "../views/notify.js";
import { notifyDoc, saveNotify, turnOnHere, turnOffHere, sendTest } from "../pushsetup.js";

const after = (promise, done) => promise.then(done, (err) => { console.error(err); state.pushStatus = "error"; }).finally(render);

function update(el) {
  const doc = notifyDoc();
  setPath(doc, el.dataset.notify, el.type === "checkbox" ? el.checked : el.value);
  saveNotify(doc);
}

export default {
  tabs: [["notify", "Notifications", notifyView]],
  actions: {
    pushOn() {
      state.pushStatus = "asking";
      after(turnOnHere(), (r) => { state.pushStatus = r === "on" ? "" : r === "denied" ? "" : "error"; });
    },
    pushOff() { after(turnOffHere(), () => { state.pushStatus = ""; }); },
    pushTest() {
      state.pushStatus = "sending";
      sendTest().then(() => { state.pushStatus = "sent"; }, (err) => { state.pushStatus = `err:${err?.message || "Couldn't send the test."}`; }).finally(render);
    },
  },
  change(el) {
    if (!el.dataset.notify) return false;
    update(el);
    if (el.type === "checkbox") render();
    return true;
  },
};
