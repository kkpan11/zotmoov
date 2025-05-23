var ZotMoovDeleteQueue = class {
    constructor(zotmoov, delay=0) {
        this._items = [];

        this._timeoutID = 0;
        this._zotmoov = zotmoov;

        this._need_to_process = 0;
        this._delay = delay;
    }

    _needToProcess() { this._need_to_process++; }
    _freeToProcess() { this._need_to_process--; }

    async lock(func)
    {
        this._needToProcess();
        try
        {
            await func();
        }
        finally
        {
            this._freeToProcess();
        }
    }

    async _doExecute()
    {
        let items = this._items.slice();

        if (items.length == 0) return;

        this._zotmoov.delete(items, Zotero.Prefs.get('extensions.zotmoov.dst_dir', true),
            {
                prune_empty_dir: Zotero.Prefs.get('extensions.zotmoov.prune_empty_dir', true),
                max_io: Zotero.Prefs.get('extensions.zotmoov.max_io_concurrency', true)
            });

        for (let item of items)
        {
            const index = this._items.indexOf(item);
            if (index > -1) this._items.splice(index, 1);
        }
    }

    async _execute()
    {
        if (this._need_to_process > 0)
        {
            clearTimeout(this._timeoutID);
            this._timeoutID = setTimeout(this._execute.bind(this), this._delay);
            return;
        }

        await this.lock(this._doExecute.bind(this));
    }

    async add(items)
    {
        this._items.push(...items);

        clearTimeout(this._timeoutID);
        this._timeoutID = setTimeout(this._execute.bind(this), this._delay);
    }

    destroy()
    {
        clearTimeout(this._timeoutID);
        this._timeoutID = 0;
    }
}

