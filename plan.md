1. **Fix `isPET` error:**
   - Add `isPET` function to `public/js/ui.js` near `isAdmin()`. The function will be:
     ```javascript
     export function isPET() {
       const u = me();
       return u && ROLES[u.role]?.isPET;
     }
     ```
   - Import `ROLES` from `./constants.js` in `public/js/ui.js`.
2. **Add "Meet Link" and "Group ID" to Meetings:**
   - In `public/js/ui.js` `openMeetingDialog`, add an input for `meetingLink`.
   - Update `saveMeeting` to save `meetingLink`.
   - When rendering a meeting in the calendar, show the "🔗 Link" if `meetingLink` exists (this is already partially done in `events.panel.js`, we can do it in `ui.js` calendar meetings too).
   - Add a `<select id="mtg-group">` dropdown to `openMeetingDialog` populated with `STATE.meta.groups`.
   - Update `saveMeeting` to save `groupId` from this dropdown.
   - Adjust `STATE.meetings` filter in `renderCalendar` so that if a meeting has a `groupId`, it's visible to everyone in that group (or visible to everyone so they can see if a person is busy, as per user's request: "it would be nice to everyone see if theres going to happen a meet"). Actually, the user says "it would be nice to everyone see if theres going to happen a meet". So maybe we just make all group meetings visible to everyone, or visible to all users? Wait, if they just want everyone to see it, we can just remove the strict filtering or adjust it.
   - Let's clarify: "some meetings are going to be for the group, but it would be nice to everyone see if theres going to happen a meet". So meetings with a `groupId` should probably be visible to *all* users, but maybe we show the group name. Let's add a `groupId` field.

   Wait, currently `meetings` filter in `renderCalendar`:
   ```javascript
   const meetings = Object.values(STATE.meetings || {}).filter(m => {
     if (m.petEvent) return isPET();
     return (m.invitees || []).includes(currentUser.uid);
   });
   ```
   If a meeting has `m.groupId`, we should return `true` (so everyone can see it).

   Wait, the user wants everyone to see it. "it would be nice to everyone see if theres going to happen a meet, so they could se if a person is busy, or if the class is full".

   So we can add: `if (m.groupId) return true;`

3. **Complete pre commit steps**
   - Call `pre_commit_instructions` and follow testing steps.

4. **Submit**
