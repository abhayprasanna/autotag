/* ======= AUTOTAG MODE  v0.4.1========
 * Pre-requisites -
 * For NLP dates: Roam42 https://roamjs.com/extensions/roam42
 * For PageSynonyms: Page Synonyms https://roamjs.com/extensions/page-synonyms
 * Hat-tips: Azlen for arrive.js idea; Tyler Wince for Unlink Finder; Chris TftHacker for Roam42; Murf for demystifying JS and refactoring the regex; David Vargas for everything!
 */

/* ======= OPTIONS ======= */

let caseinsensitive, // change to 0 to only tag references with exact case, otherwise it will alias, e.g., [book]([[Book]])
    processdates = false, // change to 0 to not process roam42 NLP dates
    processalias = false, // change to 0 to not process Page Synonyms JS aliases
    minpagelength; // change to whatever the minimum page length should be to be tagged

// Exclusions: Create an [[autotag-exclude]] page. Add pages you want to exclude, comma-spaced without [[ ]], to the first block on that page
// Change line 134 to change the keyboard shortcut to toggle on and off (default is alt+i)

import Arrive from 'arrive';
import parseTextForDates from './dateProcessing';

/* ======= CODE ========  */

let blockUid = "initial",
    attoggle = !0;

function autotag() {
    (attoggle = !attoggle) ?
        ((blockUid = "initial"),
         document
         .getElementById("autotag-icon")
         .classList.replace("bp3-icon-eye-on", "bp3-icon-eye-off")) :
        document
        .getElementById("autotag-icon")
        .classList.replace("bp3-icon-eye-off", "bp3-icon-eye-on");
}

function getAllExcludes() {
    return window.roamAlphaAPI
        .q(
            '[ :find (pull ?e [* {:block/children [*]}]) :where [?e :node/title "autotag-exclude"]]'
        )[0][0]
        .children[0].string.split(",")
        .map((e) => e.trim());
}

function getAllPages() {
    return window.roamAlphaAPI
        .q("[:find ?t :where [?e :node/title ?t] ]")
        .map((e) => e[0])
        .sort(function (e, t) {
            return t.length - e.length;
        });
}

function linkReferences(e) {
    if (!e) return undefined;
    let t = getAllPages(),
        l = [];
    0 !==
        window.roamAlphaAPI.q(
            '[:find (pull ?e [*]) :where [?e :node/title "autotag-exclude"] ]'
        ).length && (l = getAllExcludes());
    let n = t.filter((t) => {
        let n = t.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        if (l.includes(t) || t.length <= minpagelength) return !1;
        let g = new RegExp(n, "i");
        return (
            !!e.match(g) &&
                ((g = new RegExp(`\\[\\[${n}\\]\\]|#\\b${n}\\b`)), !e.match(g))
        );
    });
    n = n.sort((e, t) => t.length - e.length);
    let g = new RegExp(
        "(\\[[^\\]]+\\]\\([^ ]+\\)|{{[^}]+}}|\\S*::|\\[\\[[^\\]]+\\]\\]|\\[[^\\]]+\\]|\\[[^\\]]+$|https?://[^\\s]+|www\\.[^\\s]+)",
        "g"
    ),
        i = e,
        a = [];
    return (
        n.forEach((e) => {
            let t = e.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
                l = i.split(g),
                n = "";
            l.forEach((l) => {
                let i = l;
                if (!l.match(g) && !a.includes(e)) {
                    let l = new RegExp(`^\\b${t}\\b|[^\\[]\\b${t}\\b`, "i");
                    if (i.match(l)) {
                        let n = i.length;
                        (l = new RegExp(`(^|[^\\[])\\b(${t})\\b`)),
                        i.match(l)
                            ? (i = i.replace(l, "$1[[$2]]"))
                            : caseinsensitive &&
                            ((l = new RegExp(`(^|[^\\[])\\b(${t})\\b`, "i")),
                             (i = i.replace(l, `$1[$2]([[${e}]])`))),
                        i.length !== n && a.push(e);
                    }
                }
                n += i;
            }),
            (i = n);
        }),
        i
    );
}

function NLPdates(e) {
    return 1 == processdates ?
        parseTextForDates(e) :
        e;
}

function blockUpdate(e, t) {
    window.roamAlphaAPI.updateBlock({
        block: {
            uid: e,
            string: t
        }
    });
}

function blockAlias(e) {
    if (1 != processalias) return e;
    window.roamjs.extension.pageSynonyms.aliasBlock({
        blockUid: e
    });
}

function keydown(e) {
    if ((e = e || event).altKey && 73 === e.keyCode) {
        if ((attoggle = !attoggle))
            (blockUid = "initial"),
        document
            .getElementById("autotag-icon")
            .classList.replace("bp3-icon-eye-on", "bp3-icon-eye-off");
        else {
            let e = window.roamAlphaAPI.ui.getFocusedBlock();
            null !== e && (blockUid = e["block-uid"]),
            document
                .getElementById("autotag-icon")
                .classList.replace("bp3-icon-eye-off", "bp3-icon-eye-on");
        }
    }
}

function textareaLeave() {
    if (!attoggle) {
        let blockText = window.roamAlphaAPI.pull("[:block/string]", [":block/uid", blockUid])?.[":block/string"];
        if (!blockText) return;
        blockText = NLPdates(
            linkReferences(
                blockText,
                blockUid
            )
        );
        blockUpdate(blockUid, blockText);
        let e = blockUid;
        setTimeout(function () {
            blockAlias(e);
        }, 100);
    }
}

function textareaArrive() {
    attoggle ||
        (blockUid = window.roamAlphaAPI.ui.getFocusedBlock()["block-uid"]);
}

const nameToUse = "autotag";
const mainButtonId = nameToUse + "-button";

const panelConfig = {
    tabTitle: "Auto Tag",
    settings: [
        {id:          "caseinsensitive",
         name:        "Case Insensitive",
         description: "Only tag references with exact case, otherwise it will alias, e.g., [book]([[Book]])",
         action:      {type:     "switch",
                       onChange: (evt) => caseinsensitive = evt.target.checked}},
        {id:          "processdates",
         name:        "Natural Language dates",
         description: "Whether or not to process NLP dates",
         action:      {type:     "switch",
                       onChange: (evt) => processdates = evt.target.checked}},
        {id:          "processalias",
         name:        "Process Alias",
         description: "Whether or not to process RoamJS Page Synonyms JS aliases",
         action:      {type:     "switch",
                       onChange: (evt) => processalias = evt.target.checked}},
        {id:          "minpagelength",
         name:        "Minimum Page Length",
         description: "Change to whatever the minimum page length should be to be tagged",
         action:      {type:     "select",
                       items:    [...Array(30).keys()],
                       onChange: (item) => minpagelength = item}}
    ]
};

function setSettingDefault(extensionAPI, settingId, settingDefault) {
    let storedSetting = extensionAPI.settings.get(settingId);
    if (null == storedSetting) extensionAPI.settings.set(settingId, settingDefault);
    return storedSetting || settingDefault;
}

function onload({extensionAPI}) {
    console.log("onload");

    caseinsensitive = setSettingDefault(extensionAPI, "caseinsensitive", true);
    processdates = setSettingDefault(extensionAPI, "processdates", true);
    minpagelength = setSettingDefault(extensionAPI, "minpagelength", 2);
    extensionAPI.settings.panel.create(panelConfig);

    window.addEventListener("keydown", keydown);

    document.leave("textarea.rm-block-input", textareaLeave),
    document.arrive("textarea.rm-block-input", textareaArrive);


    var bpIconName = "eye-off",
        checkForButton = document.getElementById(nameToUse + "-icon");

    if (!checkForButton) {
        var mainButton = document.createElement("span");
        (mainButton.id = mainButtonId),
        mainButton.classList.add("bp3-popover-wrapper");
        var spanTwo = document.createElement("span");
        spanTwo.classList.add("bp3-popover-target");
        mainButton.appendChild(spanTwo);
        var mainIcon = document.createElement("span");
        (mainIcon.id = nameToUse + "-icon"),
        mainIcon.classList.add(
            "bp3-icon-" + bpIconName,
            "bp3-button",
            "bp3-minimal",
            "bp3-small"
        ),
        spanTwo.appendChild(mainIcon);
        var roamTopbar = document.getElementsByClassName("rm-topbar"),
            nextIconButton = roamTopbar[0].lastElementChild,
            flexDiv = document.createElement("div");
        (flexDiv.id = nameToUse + "-flex-space"),
        (flexDiv.className = "rm-topbar__spacer-sm"),
        nextIconButton.insertAdjacentElement("afterend", mainButton),
        mainButton.insertAdjacentElement("afterend", flexDiv),
        mainButton.addEventListener("click", autotag);
    }

    // if (attoggle) autotag();
}

function onunload() {
    console.log("onunload");

    window.removeEventListener("keydown", keydown);

    document.unbindLeave(textareaLeave);
    document.unbindArrive(textareaArrive);

    let button = document.getElementById(mainButtonId);
    if (button) button.remove();

    let flexDiv = document.getElementById(nameToUse + "-flex-space");
    if (flexDiv) flexDiv.remove();
}

export default {
    onload: onload,
    onunload: onunload
};
