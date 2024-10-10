var React = require('react');
var ReactDOM = require('react-dom');
var VirtualizedTable = require('components/virtualized-table');

class ZotMoovAdvancedPrefs {
    // Needed to fix Zotero bug where on initial load all of the elements are not
    // loaded because of faulty race-condition when calculating div height
    static FixedVirtualizedTable  = class extends VirtualizedTable {
        _getWindowedListOptions() {
            let v = super._getWindowedListOptions();
            v.overscanCount = 10;

            return v;
        }
    }

    async createCWTree()
    {
        const wc_menu_sel_val = document.getElementById('zotmoov-adv-settings-wc-sel-menu').selectedItem.value;
        Zotero.log(wc_menu_sel_val)
        const wc_commands =  this._savedcommands[wc_menu_sel_val];

        const columns = [
            {
                dataKey: 'index',
                label: 'index'
            },
            {
                dataKey: 'command_name',
                label: 'command_name'
            },
            {
                dataKey: 'desc',
                label: 'desc',
            },
        ];
        
        let renderItem = (index, selection, oldDiv=null, columns) => {
            const command = wc_commands[index];

            let div;
            if (oldDiv)
            {
                div = oldDiv;
                div.innerHTML = '';
            } else {
                div = document.createElement('div');
                div.className = 'row';
            }

            div.classList.toggle('selected', selection.isSelected(index));

            const cd = Zotero.ZotMoov.Commands.Parser.parse(command).getColumnData();
            Zotero.log(cd);
            for (let column of columns)
            {
                let span = document.createElement('span');
                span.className = 'cell';
                span.innerText = (column.dataKey == 'index') ? index.toString() : cd[column.dataKey];
                div.appendChild(span);
            }

            return div;
        };

        ReactDOM.createRoot(document.getElementById('zotmoov-adv-settings-cw-tree')).render(React.createElement(this.constructor.FixedVirtualizedTable, {
            getRowCount: () => wc_commands.length,
            id: 'zotmoov-adv-settings-cw-tree-treechildren',
            ref: (ref) => { this._cw_tree = ref; },
            renderItem: renderItem,
            onSelectionChange: (selection) => this.onCWTreeSelect(selection),
            showHeader: true,
            columns: columns,
            staticColumns: true,
            multiSelect: false,
            disableFontSizeScaling: true
        }));
    }

    init()
    {
        this._savedcommands = JSON.parse(Zotero.Prefs.get('extensions.zotmoov.cwc_commands', true));
        this.createCWTree();
    }

    createCWEntry(wc, command_name, ...args)
    {
        this._savedcommands[wc].push(Zotero.ZotMoov.Commands.Parser.create(command_name, ...args))
        this._cw_tree.invalidate();
        Zotero.Prefs.set('extensions.zotmoov.cwc_commands', JSON.stringify(this._savedcommands), true);

    }

    spawnCWDialog()
    {
        window.openDialog('chrome://zotmoov/content/custom-wc-dialog.xhtml',
            'zotmoov-custom-wc-dialog-window',
            'chrome,centerscreen,resizable=no,modal',
            document.getElementById('zotmoov-adv-settings-wc-sel-menu').selectedItem.value
        );
    }

    removeCWEntries()
    {
        let selection = this._cw_tree.selection;

        const wc_menu_sel_val = document.getElementById('zotmoov-adv-settings-wc-sel-menu').selectedItem.value;
        let wc_commands =  this._savedcommands[wc_menu_sel_val];

        for (let index of selection.selected)
        {
            wc_commands.splice(index, 1);
        }


        this._cw_tree.invalidate();
        Zotero.Prefs.set('extensions.zotmoov.cwc_commands', JSON.stringify(this._savedcommands), true);
    }

    onCWTreeSelect(selection)
    {
        let remove_button = document.getElementById('zotmoov-adv-settings-cw-delete');
        if (selection.count > 0)
        {
            remove_button.disabled = false;
            return;
        }

        remove_button.disabled = true;
    }

    changeSelectedWildcard(item)
    {
        document.getElementById('zotmoov-adv-settings-cw-tree').replaceChildren();
        this.createCWTree();
    }
}

// Expose to Zotero
Zotero.ZotMoov.Prefs.Advanced = new ZotMoovAdvancedPrefs();