
module.exports = (Plugin, Api) => {
    const {Patcher, DiscordContextMenu, DiscordModules, DOMTools, Modals, PluginUtilities, Utilities, DiscordClasses, WebpackModules} = Api;

    const DC = {
        cache: {
            users: {},
            channels: {},
            guilds: {},
            clear(list) {
                if (list) {
                    for (const id in this.users) {
                        if (!list.users.has(id)) delete this.users[id];
                    }
                    for (const id in this.channels) {
                        if (!list.channels.has(id)) delete this.channels[id];
                    }
                    for (const id in this.guilds) {
                        if (!list.guilds.has(id)) delete this.guilds[id];
                    }
                } else {
                    this.users = {};
                    this.channels = {};
                    this.guilds = {};
                }
            }
        },
        getLocalStatus() {
            return this.getStatus(this.getCurrentUser().id);
        },
        getCachedDCData(rawFunc, cacheName, id, dataPatch) {
            const raw = this[rawFunc](id);
            if (raw) {
                if (dataPatch) dataPatch(raw);
                this.cache[cacheName][id] = raw;
                return raw;
            } else {
                const cache = this.cache[cacheName][id];
                if (cache && dataPatch) dataPatch(cache);
                return cache;
            }
        },
        getCachedUser(id) {
            return this.getCachedDCData("getUser", "users", id, raw => {
                if (raw.getAvatarURL) {
                    if (raw.cachedAvatarURL === undefined) {
                        raw.cachedAvatarURL = raw.getAvatarURL();
                    }
                } else {
                    raw.getAvatarURL = () => raw.cachedAvatarURL;
                }
            });
        },
        getCachedChannel(id) {
            return this.getCachedDCData("getChannel", "channels", id);
        },
        getCachedGuild(id) {
            return this.getCachedDCData("getGuild", "guilds", id, raw => {
                if (raw.getIconURL) {
                    raw.cachedIconURL = raw.getIconURL();
                } else {
                    raw.getIconURL = () => raw.cachedIconURL;
                }
            });
        }
    };
    [
        "getVoiceStates",
        "getUser",
        "getChannel",
        "getGuild",
        "getGuilds",
        "getCurrentUser",
        "getStatus",
        "can",
        "transitionToGuild",
        "getLocaleInfo"
    ].forEach(funcName => {
         DC[funcName] = WebpackModules.getByProps(funcName)[funcName];
    });

    class SettingMonitoringList extends Api.Settings.SettingField {
        constructor(name, itemType, note, value, onChange, options = {}) {
            let itemListHTML, itemHTML;
            const containerHTML = require("settings_container.html").trim()
            const container = DOMTools.createElement(containerHTML);

            super(name, note, onChange, container);

            const list = container.querySelector(".VCUJNSettingsItemList");
            switch (itemType) {
                case "guild":
                    itemHTML = require(`settings_item_guild.html`).trim();
                    value.forEach(item => {
                        const guild = DC.getCachedGuild(item);
                        const dom = DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		guild_icon: guild.getIconURL(),
                    		guild_name: DOMTools.escapeHTML(guild.name),
                        }));
                        dom.querySelector(".VCUJNRemove").addEventListener("click", () => {
                            const idx = value.indexOf(item);
                            if (idx !== -1) {
                                value.splice(idx, 1);
                                dom.remove();
                                this.onChange(value);
                            }
                        });
                        list.append(dom);
                    });
                    break;
                case "user":
                    itemHTML = require("settings_item_user.html").trim();
                    value.forEach(item => {
                        const user = DC.getCachedUser(item);
                        const dom = DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		user_name: DOMTools.escapeHTML(user.username),
                    		user_discrim: user.discriminator,
                    		avatar_url: user.getAvatarURL(),
                        }));
                        dom.querySelector(".VCUJNRemove").addEventListener("click", () => {
                            const idx = value.indexOf(item);
                            if (idx !== -1) {
                                value.splice(idx, 1);
                                dom.remove();
                                this.onChange(value);
                            }
                        });
                        list.append(dom);
                    });
                    break;
            }
        }
    }

    return class VoiceChannelUserJoinNotification extends Plugin {
        constructor() {
            super();

            this.afkChannels = [];
            this.maxLogEntries = 0;

            this.currentLocale = "";

            this.logItemHTML = require("log_item.html").trim();
        }

        checkPatchI18n() {
            const sysLocale = DC.getLocaleInfo().code;
            if (this.currentLocale !== sysLocale) {
                this.currentLocale = sysLocale;

                // I18n patch
                for (let s = 0; s < this._config.defaultConfig.length; s++) {
                    const current = this._config.defaultConfig[s];
                    this.patchI18n("config", current);

                    if (current.type === "category") {
                        for (let s = 0; s < current.settings.length; s++) {
                            const subCurrent = current.settings[s];
                            this.patchI18n(`config.${current.id}`, subCurrent);
                        }
                    }
                }
            }
        }

        patchI18n(parentName, defConfigObj) {
            ["name", "note"].forEach(key => {
                if (defConfigObj.hasOwnProperty(key)) {
                    const localeText = this.getLocaleText(`${parentName}.${defConfigObj.id}.${key}`);
                    if (localeText !== undefined) {
                        defConfigObj[key] = localeText;
                    }
                }
            });
        }

        async onStart() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.checkPatchI18n();

            this.log = [];
            this.lastStates = {};

            const localUser = DC.getCurrentUser();

            this.migrateOldMonitoringList();
            this.parseSettings();
            if(this.settings.log.persistLog) {
                this.loadPersistLog();
            }

            this.contextMenuPatches = [];
            this.patchContextMenus();

            const logSaveCount = 120; // * 500ms => 60s
            let logSaveCounter = 0;
            let logChanged = false;

            this.update = setInterval(() => {
                if (this.settings.log.persistLog && logSaveCounter < logSaveCount) logSaveCounter++;

                if (!this.settings.options.allGuilds && this.settings.monitoring.guilds.length == 0) return;
                if (this.settings.monitoring.users.length == 0) return;
            
                const allGuilds = [];
                this.afkChannels = [];
            
                Object.values(DC.getGuilds()).forEach(g => {
                    allGuilds.push(g.id);
                    if (g.afkChannelId) this.afkChannels.push(g.afkChannelId);
                });
            
                const targetGuilds = this.settings.options.allGuilds ? allGuilds : this.settings.monitoring.guilds;
            
                const newStates = targetGuilds.map(gid => DC.getVoiceStates(gid)).reduce((a, v) => {return {...v, ...a}});

                for(let id in newStates) {
                    let noNotify = false;

                    if(localUser.id === id) continue;
                    if (!this.settings.monitoring.users.includes(id)) {
                        if (this.settings.log.logAllUsers) noNotify = true;
                        else continue;
                    }

                    if(this.lastStates[id] === undefined) {
                        const user = DC.getCachedUser(id), channel = DC.getCachedChannel(newStates[id].channelId);
                        if(user && channel) {
                            const guild = DC.getCachedGuild(channel.guild_id);
                            this.notificationAndLog({act: "Join", user, channel, guild}, noNotify);
                            logChanged = true;
                        }
                    } else {

                        if(this.lastStates[id].channelId !== newStates[id].channelId) {

                            const user = DC.getCachedUser(id), channel = DC.getCachedChannel(newStates[id].channelId);
                            const lastChannel = DC.getCachedChannel(this.lastStates[id].channelId);

                            if(user && channel) {
                                const guild = DC.getCachedGuild(channel.guild_id);
                                this.notificationAndLog({act: "Move", user, channel, lastChannel, guild}, noNotify);
                                logChanged = true;
                            }

                            continue;

                        }

                    }

                }

                for(let id in this.lastStates) {
                    let noNotify = false;

                    if(localUser.id === id) continue;
                    if (!this.settings.monitoring.users.includes(id)) {
                        if (this.settings.log.logAllUsers) noNotify = true;
                        else continue;
                    }

                    if(newStates[id] === undefined && id !== localUser.id) {
                        const user = DC.getCachedUser(id), channel = DC.getCachedChannel(this.lastStates[id].channelId);
                        if(user && channel) {
                            const guild = DC.getCachedGuild(channel.guild_id);
                            this.notificationAndLog({act: "Leave", user, channel, guild}, noNotify);
                            logChanged = true;
                        }
                    }
                }

                this.lastStates = newStates;

                if (logChanged && logSaveCounter >= logSaveCount) {
                    logChanged = false;
                    logSaveCounter = 0;

                    this.savePersistLog();
                }
            }, 500);

            this.focused = true;

            this.focus = () => this.focused = true;
            this.unfocus = () => this.focused = false;

            window.addEventListener("focus", this.focus);
            window.addEventListener("blur", this.unfocus);

            this.onKeyDown = e => {

                if(this.settings.options.logHotkey && e.altKey && e.key == "v") {
                    this.showVoiceLogModal();
                }

            };

            document.addEventListener("keydown", this.onKeyDown);
        }

        onStop() {
            clearInterval(this.update);
            window.removeEventListener("focus", this.focus);
            window.removeEventListener("blur", this.unfocus);
            document.removeEventListener("keydown", this.onKeyDown);
            this.unpatchContextMenus();
            if(this.settings.log.persistLog) {
                this.savePersistLog();
            }
            this.saveSettings();
        }

        migrateOldMonitoringList() {
            let didMigration = false;
            if (typeof this.settings.monitoring.guilds === "string") {
                const oriVal = this.settings.monitoring.guilds;
                this.settings.monitoring.guilds = [];
                oriVal.split(",").forEach(l => {
                    this.settings.monitoring.guilds.push(l.split("#")[0].trim());
                });
                didMigration = true;
            }
            if (typeof this.settings.monitoring.users === "string") {
                const oriVal = this.settings.monitoring.users;
                this.settings.monitoring.users = [];
                oriVal.split(",").forEach(l => {
                    this.settings.monitoring.users.push(l.split("#")[0].trim());
                });
                didMigration = true;
            }
            if (didMigration) this.saveSettings();
        }

        parseSettings() {
            this.maxLogEntries = parseInt(this.settings.log.maxLogEntries, 10);
        }

        loadPersistLog() {
            const {DCDataCache, lastStates, log} = PluginUtilities.loadData(this.getName() + 'Data', 'data', {
                DCDataCache: DC.cache,
                lastStates: {},
                log: []
            });
            DC.cache = DCDataCache;
            this.lastStates = lastStates;
            this.log = log;
        }

        savePersistLog() {
            DC.cache.clear(this.getCacheKeepList());
            PluginUtilities.saveData(this.getName() + 'Data', 'data', {
                DCDataCache: DC.cache,
                lastStates: this.lastStates,
                log: this.log
            });
        }

        getCacheKeepList() {
            const list = {
                users: new Set(),
                channels: new Set(),
                guilds: new Set()
            };
            this.settings.monitoring.users.forEach(u => {
                if (!list.users.has(u)) list.users.add(u);
            });
            this.settings.monitoring.guilds.forEach(g => {
                if (!list.guilds.has(g)) list.guilds.add(g);
            });
            this.log.forEach(l => {
                if (!list.users.has(l.userId)) list.users.add(l.userId);
                if (!list.channels.has(l.channelId)) list.channels.add(l.channelId);
                if (!list.channels.has(l.lastChannelId)) list.channels.add(l.lastChannelId);
                if (!list.guilds.has(l.guildId)) list.guilds.add(l.guildId);
            });
            return list;
        }

        addMonitoringList(type, id) {
            let list;
            switch (type) {
                case "guild":
                    list = this.settings.monitoring.guilds;
                    break;
                case "user":
                    list = this.settings.monitoring.users;
                    break;
                default:
                    return; // unknown type => skip
            }

            if (!list.includes(id)) {
                list.push(id);
                this.saveSettings();
            }
        }

        removeMonitoringList(type, id) {
            let list;
            switch (type) {
                case "guild":
                    list = this.settings.monitoring.guilds;
                    break;
                case "user":
                    list = this.settings.monitoring.users;
                    break;
                default:
                    return; // unknown type => skip
            }

            const idx = list.indexOf(id);
            if (idx !== -1) {
                list.splice(idx, 1);
                this.saveSettings();
            }
        }

        unpatchContextMenus() {
            this.contextMenuPatches.forEach(f => f());
        }

        patchContextMenus() {
            this.patchGuildContextMenu();
            this.patchVoiceChannelContextMenu();
            this.patchUserContextMenu();
        }

        patchGuildContextMenu() {
            const GuildContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "GuildContextMenu");
            this.contextMenuPatches.push(Patcher.after(GuildContextMenu, "default", (_, [props], retVal) => {
                const menuChildren = Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                );
                menuChildren.push(DiscordContextMenu.buildMenuItem({
                    id: "VCUJNContextmenuGuildVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({guildId: props.guild.id});
                    }
                }));
                if (this.settings.monitoring.guilds.includes(props.guild.id)) {
                    menuChildren.push(DiscordContextMenu.buildMenuItem({
                        id: "VCUJNContextmenuRemoveUserMonitoring",
                        label: this.getLocaleText("contextmenuRemoveMonitoring"), action: () => {
                            this.removeMonitoringList("guild", props.guild.id);
                        }
                    }));
                } else {
                    menuChildren.push(DiscordContextMenu.buildMenuItem({
                        id: "VCUJNContextmenuAddUserMonitoring",
                        label: this.getLocaleText("contextmenuAddMonitoring"), action: () => {
                            this.addMonitoringList("guild", props.guild.id);
                        }
                    }));
                }
            }));
        }

        patchVoiceChannelContextMenu() {
            const VCCMs = WebpackModules.getModules(m => m.default && m.default.displayName == "ChannelListVoiceChannelContextMenu");
            const patch = (_, [props], retVal) => {
                Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                ).push(DiscordContextMenu.buildMenuItem({
                    id: "VCUJNContextmenuChannelVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({channelId: props.channel.id});
                    }
                }));
            };
            VCCMs.forEach(VCCM => {
                this.contextMenuPatches.push(Patcher.after(VCCM, "default", patch));
            });
        }

        patchUserContextMenu() {
            const UserContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "GuildChannelUserContextMenu");
            const DMUserContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "DMUserContextMenu");
            const patch = (_, [props], retVal) => {
                const menuChildren = Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                );
                menuChildren.push(DiscordContextMenu.buildMenuItem({
                    id: "VCUJNContextmenuUserVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({userId: props.user.id});
                    }
                }));
                if (this.settings.monitoring.users.includes(props.user.id)) {
                    menuChildren.push(DiscordContextMenu.buildMenuItem({
                        id: "VCUJNContextmenuRemoveGuildMonitoring",
                        label: this.getLocaleText("contextmenuRemoveMonitoring"), action: () => {
                            this.removeMonitoringList("user", props.user.id);
                        }
                    }));
                } else {
                    menuChildren.push(DiscordContextMenu.buildMenuItem({
                        id: "VCUJNContextmenuAddGuildMonitoring",
                        label: this.getLocaleText("contextmenuAddMonitoring"), action: () => {
                            this.addMonitoringList("user", props.user.id);
                        }
                    }));
                }
            };
            this.contextMenuPatches.push(Patcher.after(UserContextMenu, "default", patch));
            this.contextMenuPatches.push(Patcher.after(DMUserContextMenu, "default", patch));
        }

        showVoiceLogModal({userId, channelId, guildId}={}) {
            this.checkPatchI18n();
            let log = this.log;
            if (guildId !== undefined) log = log.filter(entry => entry.guildId === guildId);
            if (channelId !== undefined) log = log.filter(entry => entry.channelId === channelId || entry.lastChannelId === channelId);
            if (userId !== undefined) log = log.filter(entry => entry.userId === userId);
            const ce = DiscordModules.React.createElement;
            const AuditLog = DiscordClasses.AuditLog;
            const children = log.map(entry => {
                const user = DC.getCachedUser(entry.userId);
                const channel = DC.getCachedChannel(entry.channelId);
                const guild = DC.getCachedGuild(entry.guildId);
                if (user === undefined || channel === undefined || guild === undefined) return null;
                return ce("div", { dangerouslySetInnerHTML:{ __html: Utilities.formatString(this.logItemHTML, {
                    user_name: DOMTools.escapeHTML(user.username),
                    user_discrim: user.discriminator,
                    avatar_url: user.getAvatarURL(),
                    action: DOMTools.escapeHTML(this.getLocaleText(`notification${entry.act}`)),
                    channel_name: DOMTools.escapeHTML(channel.name),
                    guild_icon: guild.getIconURL(),
                    guild_name: DOMTools.escapeHTML(guild.name),
                    timestamp: DOMTools.escapeHTML(new Date(entry.timestamp).toLocaleString())
                }) } });
            });
            Modals.showModal(this.getLocaleText("modalLogTitle"), children, {cancelText: null});
        }

        checkChannelVisibility(channel) {
            return DC.can(DiscordModules.DiscordConstants.Permissions["VIEW_CHANNEL"], channel);
        }

        pushLog(logEntry) {
            this.log.unshift(logEntry);
            if (this.log.length > this.maxLogEntries) {
                this.log.pop();
            }
        }

        notificationAndLog({act, user, channel, lastChannel, guild}, noNotify) {
            const lastChannelId = lastChannel === undefined ? null : lastChannel.id;
            if (this.settings.log.logInvisible || this.checkChannelVisibility(channel)) this.pushLog({
                userId: user.id,
                channelId: channel.id,
                lastChannelId,
                guildId: guild.id,
                timestamp: new Date().getTime(),
                act
            });
            if(!noNotify && !(this.settings.options.suppressInDnd && DC.getLocalStatus() == "dnd") && !this.afkChannels.includes(channel.id) && (act !== "Leave" || this.settings.options.notifyLeave) && (this.settings.options.notifyInvisible || this.checkChannelVisibility(channel))) {
                this.checkPatchI18n();
                const notification = new Notification(this.getLocaleText(`notification${act}Message`, {
                    user: user.username,
                    channel: channel.name,
                    guild: guild.name
                }), {
                    silent: this.settings.options.silentNotification,
                    icon: user.getAvatarURL()
                });
                if (act === "Join" || act === "Move") {
                    notification.addEventListener("click", () => {
                        DC.transitionToGuild(guild.id);
                    });
                }
            }
        }

        getLocaleText(id, args) {
            switch (DC.getLocaleInfo().code) {
                case "zh-TW":
                    switch (id) {
                        case "config.monitoring.name":
                            return "監測清單";
                        case "config.options.name":
                            return "其他選項";
                        case "config.monitoring.guilds.name":
                            return "監測伺服器清單(使用伺服器右鍵選單增加)";
                        case "config.monitoring.users.name":
                            return "監測使用者清單(使用使用者右鍵選單增加)";
                        case "config.log.name":
                            return "記錄相關選項";
                        case "config.log.logAllUsers.name":
                            return "記錄所有使用者";
                        case "config.log.logInvisible.name":
                            return "記錄隱藏頻道";
                        case "config.log.persistLog.name":
                            return "儲存紀錄";
                        case "config.log.maxLogEntries.name":
                            return "最大紀錄數量";
                        case "config.options.allGuilds.name":
                            return "檢查所有已加入伺服器";
                        case "config.options.notifyInvisible.name":
                            return "通知隱藏頻道";
                        case "config.options.notifyLeave.name":
                            return "通知退出語音頻道";
                        case "config.options.silentNotification.name":
                            return "使用無聲通知";
                        case "config.options.suppressInDnd.name":
                            return "勿擾模式時關閉通知";
                        case "config.options.logHotkey.name":
                            return "啟用 Alt+V 開啟記錄視窗";
                        
                        case "notificationJoinMessage":
                            return `${args.user} 進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "進入了";
                        case "notificationMoveMessage":
                            return `${args.user} 移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "移動到";
                        case "notificationLeaveMessage":
                            return `${args.user} 離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "離開";

                        case "modalLogTitle":
                            return "語音通知紀錄";
                        case "contextmenuVoiceLog":
                            return "語音記錄";
                        case "contextmenuAddMonitoring":
                            return "加入語音監測";
                        case "contextmenuRemoveMonitoring":
                            return "移除語音監測";
                    }
                case "en-US":
                default:
                    switch (id) {
                        case "config.monitoring.name":
                            return "Monitoring List";
                        case "config.options.name":
                            return "Other Options";
                        case "config.monitoring.guilds.name":
                            return "Monitoring Guild List (Add with guild context menu)";
                        case "config.monitoring.users.name":
                            return "Monitoring User List (Add with user context menu)";
                        case "config.log.name":
                            return "Log related";
                        case "config.log.logAllUsers.name":
                            return "Log all user actions";
                        case "config.log.logInvisible.name":
                            return "Log invisible channels";
                        case "config.log.persistLog.name":
                            return "Persist log";
                        case "config.log.maxLogEntries.name":
                            return "Max log entries counts";
                        case "config.options.allGuilds.name":
                            return "Monitor all guilds";
                        case "config.options.notifyInvisible.name":
                            return "Notify for invisible channels";
                        case "config.options.notifyLeave.name":
                            return "Notify user leaves";
                        case "config.options.silentNotification.name":
                            return "Silent notifications";
                        case "config.options.suppressInDnd.name":
                            return "Suppress notifications while in Do Not Disturb";
                        case "config.options.logHotkey.name":
                            return "Enable Alt+V Log Panel";
                        
                        case "notificationJoinMessage":
                            return `${args.user} joined ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "Joined";
                        case "notificationMoveMessage":
                            return `${args.user} moved to ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "Moved to";
                        case "notificationLeaveMessage":
                            return `${args.user} left ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "Left";

                        case "modalLogTitle":
                            return "Voice Notification Log";
                        case "contextmenuVoiceLog":
                            return "Voice Log";
                        case "contextmenuAddMonitoring":
                            return "Add to Monitoring";
                        case "contextmenuRemoveMonitoring":
                            return "Remove from Monitoring";
                    }
            }
        }

        buildSetting(data) {
            const {name, note, type, itemType, value, onChange, id} = data;
            let setting = null;
            if (type === "monitoringList") {
                setting = new SettingMonitoringList(name, itemType, note, value, onChange)
                if (id) setting.id = id;
            }
            else setting = super.buildSetting(data);
            return setting;
        }

        getSettingsPanel() {
            this.checkPatchI18n();
            const panel = this.buildSettingsPanel();
            panel.addListener(this.parseSettings.bind(this));
            return panel.getElement();
        }

    };
};
