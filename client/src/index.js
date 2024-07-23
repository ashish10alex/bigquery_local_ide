import perspective from "@finos/perspective";
import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-viewer/dist/css/themes.css";


import { basicSetup, EditorView } from "codemirror"
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { history } from '@codemirror/commands'
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { crosshairCursor, drawSelection, highlightSpecialChars, lineNumbers, rectangularSelection } from '@codemirror/view'
import { highlightSelectionMatches } from '@codemirror/search'
import { EditorState, Compartment } from '@codemirror/state'


import { solarizedDark } from 'cm6-theme-solarized-dark'
import { solarizedLight } from 'cm6-theme-solarized-light'

const themes = {
    'Solarized Light': solarizedLight,
    'Solarized Dark': solarizedDark,
}

const themeConfig = new Compartment()

import { sql } from "@codemirror/lang-sql"
import { vim } from "@replit/codemirror-vim"


const worker = perspective.worker();
var editor;
var errorLine = -1;

const spinner = document.querySelector('.lds-ellipsis');

function showSpinner() {
    spinner.classList.remove('hidden');
}

function focusEditor() {
    const timer = setInterval(() => {
        editor.focus();
        if (editor.hasFocus) clearInterval(timer);
    }, 500);
}

function hideSpinner() {
    spinner.classList.add('hidden');
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

const debouncedDocumentUpdate = debounce((update) => {
    const newContent = update.state.doc.toString();
    let dryRunApiPath = "http://localhost:3000/query_dry_run/" + encodeURIComponent(newContent);

    fetchData(dryRunApiPath).then((data) => {
        let dryRunErrorParagraph = document.getElementById('dryRunError');
        if (data?.error.hasError) {
            dryRunErrorParagraph.style.color = "red";
            dryRunErrorParagraph.innerHTML = data.error.message;
        } else {
            dryRunErrorParagraph.style.color = "white";
            dryRunErrorParagraph.innerHTML = `Success - ${data.statistics.totalBytesProcessed} bytes processed at [ ${new Date()} ]`
        }
    });
}, 500);

const documentUpdatedListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
        debouncedDocumentUpdate(update);
    }
});

document.addEventListener('DOMContentLoaded', function() {

    const initialText = `
select 1 as a
union all
select 2 as a
union all
select 3 as a
union all
select 3 as a
union all
select 5 as a
    `
    const targetElement = document.querySelector('#editor')
    // Apply styles to the editor wrapper
    targetElement.style.top = '10vh';
    targetElement.style.height = '40vh';
    targetElement.style.fontSize = '16px';
    targetElement.style.fontFamily = 'Arial, sans-serif';

    editor = new EditorView({
        doc: initialText,
        extensions: [
            vim(),
            basicSetup,
            documentUpdatedListener,
            //documentUpdatedListner,
            lineNumbers(),
            highlightSpecialChars(),
            history(),
            //gutter({ class: "cm-mygutter" }),
            drawSelection(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightSelectionMatches(),
            sql({
                upperCaseKeywords: true
            }),
            EditorView.theme({
                "&": {
                    height: '100%', // Ensure the editor takes the full height of the parent
                    width: '100%', // Ensure the editor takes the full width of the parent
                    fontSize: 'inherit', // Inherit font size from parent
                    fontFamily: 'inherit' // Inherit font family from parent
                }
            }),
            themeConfig.of(themes['Solarized Light']),
        ],
        parent: targetElement,
    })
    addThemeDropdown();
    focusEditor();

});

// add a dropdown on the rigth side of the editor to select the themes
function addThemeDropdown() {
    var themeDropdown = document.createElement("select");
    themeDropdown.id = "themeDropdown";
    themeDropdown.style.position = "absolute";
    themeDropdown.style.right = "10px";
    themeDropdown.style.top = "95px";
    themeDropdown.style.zIndex = "10";
    themeDropdown.style.padding = "5px";
    themeDropdown.style.borderRadius = "5px";
    themeDropdown.style.backgroundColor = "#333";
    themeDropdown.style.color = "white";
    themeDropdown.style.border = "none";
    themeDropdown.style.fontFamily = "Arial, sans-serif";
    themeDropdown.style.fontSize = "16px";
    themeDropdown.style.cursor = "pointer";

    var _themes = ["Solarized Light", "Solarized Dark"];

    _themes.forEach(theme => {
        var option = document.createElement("option");
        option.value = theme;
        option.text = theme;
        themeDropdown.appendChild(option);
    });

    themeDropdown.addEventListener("change", function() {
        editor.dispatch({
            effects: themeConfig.reconfigure(themes[themeDropdown.value])
        })
    });

    document.body.appendChild(themeDropdown);
}

/*
function setRedGutterMarker(line) {
    var marker = document.createElement("div");
    marker.innerHTML = "!";
    marker.style.color = "red";
    marker.style.fontWeight = "bold";
    editor.setGutterMarker(line, "red-gutter", marker);
}

function clearGutterMarker(line) {
    editor.setGutterMarker(line, "red-gutter", null);
}
*/


export async function fetchData(apiPath) {
    try {
        const response = await fetch(apiPath);
        if (!response.ok) {
            let error = await response.json()
            if (error.error) {
                error = error.error;
                return { error: error };
            }
        }
        const responseMetadata = await response.json();
        return responseMetadata;
    } catch (error) {
        console.log('Error fetching metadata:', error);
    }

}

async function runQueryInBigQuery(editorContent) {
    /*
    if (errorLine !== -1) {
        clearGutterMarker(errorLine);
    }
    */
    if (!editorContent) {
        var editorContent = editor.state.doc.toString();
    }
    let text = encodeURIComponent(editorContent);
    let apiPath = "http://localhost:3000/run_query/" + text;

    showSpinner();
    let runButton = document.getElementById('runQueryButton');
    runButton.innerHTML = "Running...";
    runButton.disabled = true;

    let cancelQueryButton = document.getElementById('cancelQueryButton');
    cancelQueryButton.disabled = false;
    cancelQueryButton.backgroundColor = "#3367d6";

    cancelQueryButton.onclick = function() {

        let cancelQueryApiPath = "http://localhost:3000/cancel_job";
        // TODO: Handle error when canceling query
        //let cancelQuery = fetchData(cancelQueryApiPath).then((data) => {
        //    console.log(data);
        //});


        runButton.innerHTML = "Run";
        runButton.disabled = false;
        cancelQueryButton.disabled = true;
        cancelQueryButton.backgroundColor = "gray";
        hideSpinner();
    }


    let data = await fetch(apiPath)


    data = await data.json();
    if (data?.dryRunResponse?.error?.hasError) {
        errorLine = data.dryRunResponse.error.location.line - 1;
        //setRedGutterMarker(errorLine);
        let dryRunErrorParagraph = document.getElementById('dryRunError');
        dryRunErrorParagraph.style.color = "red";
        dryRunErrorParagraph.innerHTML = data.dryRunResponse.error.message;

    } else {
        let dryRunErrorParagraph = document.getElementById('dryRunError');
        dryRunErrorParagraph.style.color = "white";
        dryRunErrorParagraph.innerHTML = `Success - ${data.dryRunResponse.statistics.totalBytesProcessed} bytes processed at [ ${new Date()} ]`
        const table = worker.table(data.rows);
        const viewer = document.querySelector("perspective-viewer");
        viewer.load(table);
        viewer.restore({ settings: true, plugin_config: { editable: true } });
    }
    runButton.innerHTML = "Run";
    runButton.disabled = false;
    hideSpinner();
}

function getQueryToRun() {
    return editor.state.doc.toString();
    //return editor.state.sliceDoc(editor.cm.state.vim.lastSelection.anchorMark.cm.cm6.docView.domChanged.newSel.from, editor.cm.state.vim.lastSelection.anchorMark.cm.cm6.docView.domChanged.newSel.to)
    //let startOfSelection = editor.getCursor(true);
    //let endOfSelection = editor.getCursor(false);
    //let isNoSelection = (startOfSelection.line === endOfSelection.line && startOfSelection.ch === endOfSelection.ch);
    //if (isNoSelection) {
    //    return editor.getValue();
    //}
    //return editor.getRange(startOfSelection, endOfSelection);
}

document.getElementById('runQueryButton').addEventListener('click', async function() {
    runQueryInBigQuery();
});


document.addEventListener('keydown', function(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        let queryToRun = getQueryToRun();
        runQueryInBigQuery(queryToRun);
    }
});
