/**
 * @name VoiceChannelUserJoinNotification
 * @description A simple BetterDiscord plugin for you to monitor specific users joining voice channels in spcific guilds. (Originaly modified from VoiceChatNotifications by Metalloriff)
 * @version 0.1.14
 * @author DannyAAM
 * @authorId 275978619354873856
 * @website https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification
 * @source https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js
 * @donate https://paypal.me/DannyAAM
 * @invite YFAATzsKmM
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    info: {
        name: "VoiceChannelUserJoinNotification",
        authors: [
            {
                name: "DannyAAM",
                discord_id: "275978619354873856",
                github_username: "danny8376",
                twitter_username: "DannyAAMtw"
            }
        ],
        version: "0.1.14",
        description: "A simple BetterDiscord plugin for you to monitor specific users joining voice channels in spcific guilds. (Originaly modified from VoiceChatNotifications by Metalloriff)",
        github: "https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification",
        github_raw: "https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js",
        donate: "https://paypal.me/DannyAAM",
        invite: "YFAATzsKmM"
    },
    changelog: [
        {
            title: "Try to make it work again",
            type: "fixed",
            items: [
                "As the title, seems to be working now?"
            ]
        },
        {
            title: "Fix locale detection",
            type: "fixed",
            items: [
                "Locale should work now... Only Triditional Chinese users will notice that though."
            ]
        },
        {
            title: "Fix webhook",
            type: "fixed",
            items: [
                "Webhook should work now... unexpected little api change..."
            ]
        },
        {
            title: "Thanks",
            type: "progress",
            items: [
                "This plugins is originaly modified from VoiceChatNotifications by Metalloriff (https://github.com/Metalloriff/BetterDiscordPlugins/blob/a056291d1498deb721908cce45cff5625c7a7f1e/VoiceChatNotifications.plugin.js). Learned from his plugins how to implement this plugin. Thanks for him."
            ]
        }
    ],
    main: "index.js",
    defaultConfig: [
        {
            type: "category",
            id: "monitoring",
            name: "i18n:MonitoringTitle",
            collapsible: false,
            shown: true,
            settings: [
                {
                    type: "monitoringList",
                    itemType: "guild",
                    id: "guilds",
                    name: "i18n:GuildsTitle",
                    note: "",
                    value: []
                },
                {
                    type: "monitoringList",
                    itemType: "user",
                    id: "users",
                    name: "i18n:UsersTitle",
                    note: "",
                    value: []
                }
            ]
        },
        {
            type: "category",
            id: "log",
            name: "i18n:LogTitle",
            collapsible: false,
            shown: true,
            settings: [
                {
                    type: "switch",
                    id: "logAllUsers",
                    name: "i18n:LogAllUsers",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "logInvisible",
                    name: "i18n:LogInvisible",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "persistLog",
                    name: "i18n:PersistLog",
                    note: "",
                    value: false
                },
                {
                    type: "textbox",
                    id: "maxLogEntries",
                    name: "i18n:MaxLogEntries",
                    note: "",
                    value: "250"
                }
            ]
        },
        {
            type: "category",
            id: "options",
            name: "i18n:OptionsTitle",
            collapsible: false,
            shown: true,
            settings: [
                {
                    type: "switch",
                    id: "allGuilds",
                    name: "i18n:AllGuilds",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "notifyInvisible",
                    name: "i18n:NotifyInvisible",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "notifyLeave",
                    name: "i18n:NotifyLeave",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "silentNotification",
                    name: "i18n:SilentNotification",
                    note: "",
                    value: false
                },
                {
                    type: "switch",
                    id: "suppressInDnd",
                    name: "i18n:SuppressInDnd",
                    note: "",
                    value: true
                },
                {
                    type: "switch",
                    id: "logHotkey",
                    name: "i18n:LogHotkey",
                    note: "",
                    value: true
                }
            ]
        },
        {
            type: "category",
            id: "remoteNotify",
            name: "i18n:remoteNotifyTitle",
            collapsible: false,
            shown: true,
            settings: [
                {
                    type: "switch",
                    id: "enable",
                    name: "i18n:remoteNotifyEnable",
                    note: "",
                    value: false
                },
                {
                    type: "textbox",
                    id: "uri",
                    name: "i18n:remoteNotifyUri",
                    note: "",
                    value: "https://webhook.example/webhook"
                },
                {
                    type: "textbox",
                    id: "contentType",
                    name: "i18n:remoteNotifyContentType",
                    note: "",
                    value: "application/json"
                },
                {
                    type: "textbox",
                    id: "body",
                    name: "i18n:remoteNotifyBody",
                    note: "",
                    value: ""
                }
            ]
        }
    ]
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Api) => {
    const {Patcher, DiscordModules, DOMTools, Modals, PluginUtilities, Utilities, DiscordClasses, WebpackModules} = Api;
    const {React, DiscordPermissions} = DiscordModules;
    const {ContextMenu, DOM} = BdApi;

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
        data4JSON() {
            const dump = {
                users: this.cache.users,
                channels: {},
                guilds: {}
            }
            for (const id in this.cache.channels) {
                dump.channels[id] = Object.assign({}, this.cache.channels[id]);
                delete dump.channels[id].permissionOverwrites;
            }
            for (const id in this.cache.guilds) {
                dump.guilds[id] = Object.assign({}, this.cache.guilds[id]);
                delete dump.guilds[id].roles;
            }
            return dump;
        },
        getLocalStatus() {
            return this.getStatus(this.getCurrentUser().id);
        },
        getCachedDCData(rawFunc, cacheName, id, {prePatch, postPatch}) {
            const raw = this[rawFunc](id);
            if (raw) {
                if (prePatch) prePatch(raw);
                this.cache[cacheName][id] = raw;
                return raw;
            } else {
                const cache = this.cache[cacheName][id];
                if (cache && postPatch) postPatch(cache);
                return cache;
            }
        },
        getCachedUser(id) {
            return this.getCachedDCData("getUser", "users", id, {
                prePatch(raw) {
                    if (raw.getAvatarURL && raw.cachedAvatarURL === undefined) {
                        raw.cachedAvatarURL = raw.getAvatarURL();
                    }
                },
                postPatch(cache) {
                    if (!cache.getAvatarURL) {
                        cache.getAvatarURL = () => cache.cachedAvatarURL;
                    }
                }
            });
        },
        getCachedChannel(id) {
            return this.getCachedDCData("getChannel", "channels", id, {
                postPatch(cache) {
                    cache.permissionOverwrites = this.channelPermsProxy;
                }
            });
        },
        getCachedGuild(id) {
            return this.getCachedDCData("getGuild", "guilds", id, {
                prePatch(raw) {
                    if (raw.getIconURL && raw.cachedIconURL === undefined) {
                        raw.cachedIconURL = raw.getIconURL();
                    }
                },
                postPatch(cache) {
                    if (!cache.getIconURL) {
                        cache.getIconURL = () => cache.cachedIconURL;
                        cache.roles = this.guildRolesProxy;
                    }
                }
            });
        },
        channelPermsProxy: new Proxy({}, {
            get(target, name) {
                return this.getChannel(target.id).permissionOverwrites[name];
            }
        }),
        guildRolesProxy: new Proxy({}, {
            get(target, name) {
                return this.getGuild(target.id).roles[name];
            }
        })
    };
    [
        "getVoiceStates||isCurrentClientInVoiceChannel",
        "getUser|UserStore",
        "getChannel|ChannelStore",
        "getGuild|GuildStore",
        "getGuilds|GuildStore",
        "getCurrentUser|UserStore",
        "getStatus|UserStatusStore",
        "can|Permissions",
        "transitionToGuild|NavigationUtils",
        "getLocale|LocaleManager"
    ].forEach((names) => {
        const [funcName, storeName, searchPropName] = names.split("|");
        let store = storeName ? DiscordModules[storeName] : WebpackModules.getByProps(searchPropName || funcName);
        DC[funcName] = store[funcName].bind(store);
    });

    class SettingMonitoringList extends Api.Settings.SettingField {
        constructor(name, itemType, note, value, onChange, options = {}) {
            let itemListHTML, itemHTML;
            const containerHTML = `<div class="scroller-2wx7Hm da-scroller thin-1ybCId scrollerBase-289Jih fade-2kXiP2" role="list" style="overflow: hidden scroll; padding-right: 0px; max-height: 15em;">
  <div class="listContent-2_qb-y da-listContent VCUJNSettingsItemList" style="">
  </div>
</div>
`.trim()
            const container = DOMTools.createElement(containerHTML);

            super(name, note, onChange, container);

            const list = container.querySelector(".VCUJNSettingsItemList");
            switch (itemType) {
                case "guild":
                    itemHTML = `<div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 auditLog-3jNbM6 da-auditLog marginBottom8-AtZOdT da-marginBottom8" style="flex: 1 1 auto;">
  <div class="header-GwIGlr da-header" aria-expanded="false" role="button" tabindex="0">
    <div class="avatar-_VZUJy da-avatar wrapper-3t9DeA da-wrapper" role="img" aria-hidden="true" style="width: 40px; height: 40px;">
      <svg width="49" height="40" viewBox="0 0 49 40" class="mask-1l8v16 da-mask svg-2V3M55 da-svg" aria-hidden="true">
        <foreignObject x="0" y="0" width="40" height="40" mask="url(#svg-mask-avatar-default)">
          <img src="{{guild_icon}}" alt=" " class="avatar-VxgULZ da-avatar" aria-hidden="true">
        </foreignObject>
      </svg>
    </div>
    <div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 timeWrap-2DasL6 da-timeWrap" style="flex: 1 1 auto;">
      <div class="overflowEllipsis-1PBFxQ da-overflowEllipsis flexChild-faoVW3 da-flexChild" style="flex: 1 1 auto; word-wrap: break-word; white-space: normal;">
        <span class="targetChannel-TrRFlx da-targetChannel"><strong>{{guild_name}}</strong></span>
      </div>
    </div>
    <div style="float: right; cursor: pointer;" class="VCUJNRemove"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" style="width: 18px; height: 18px;"><g class="background" fill="none" fill-rule="evenodd"><path d="M0 0h12v12H0"></path><path class="fill" fill="#dcddde" d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6"></path></g></svg></div>
  </div>
</div>

`.trim();
                    value.forEach(item => {
                        const guild = DC.getCachedGuild(item);
                        const dom = guild ? DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		guild_name: DOMTools.escapeHTML(guild.name),
                    		guild_icon: guild.getIconURL(),
                        })) : DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		guild_name: `ID:${item}`,
                    		guild_icon: "",
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
                    itemHTML = `<div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 auditLog-3jNbM6 da-auditLog marginBottom8-AtZOdT da-marginBottom8" style="flex: 1 1 auto;">
  <div class="header-GwIGlr da-header" aria-expanded="false" role="button" tabindex="0">
    <div class="avatar-_VZUJy da-avatar wrapper-3t9DeA da-wrapper" role="img" aria-hidden="true" style="width: 40px; height: 40px;">
      <svg width="49" height="40" viewBox="0 0 49 40" class="mask-1l8v16 da-mask svg-2V3M55 da-svg" aria-hidden="true">
        <foreignObject x="0" y="0" width="40" height="40" mask="url(#svg-mask-avatar-default)">
          <img src="{{avatar_url}}" alt=" " class="avatar-VxgULZ da-avatar" aria-hidden="true">
        </foreignObject>
      </svg>
    </div>
    <div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 timeWrap-2DasL6 da-timeWrap" style="flex: 1 1 auto;">
      <div class="overflowEllipsis-1PBFxQ da-overflowEllipsis flexChild-faoVW3 da-flexChild" style="flex: 1 1 auto; word-wrap: break-word; white-space: normal;">
        <span class="userHook-3AdCBF da-userHook"><span>{{user_name}}</span><span class="discrim-3rYTMj da-discrim">#{{user_discrim}}</span></span>
      </div>
    </div>
    <div style="float: right; cursor: pointer;" class="VCUJNRemove"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" style="width: 18px; height: 18px;"><g class="background" fill="none" fill-rule="evenodd"><path d="M0 0h12v12H0"></path><path class="fill" fill="#dcddde" d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6"></path></g></svg></div>
  </div>
</div>

`.trim();
                    value.forEach(item => {
                        const user = DC.getCachedUser(item);
                        const dom = user ? DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		user_name: DOMTools.escapeHTML(user.username),
                    		user_discrim: user.discriminator,
                    		avatar_url: user.getAvatarURL(),
                        })) : DOMTools.createElement(Utilities.formatString(itemHTML, {
                    		user_name: `ID:${item}`,
                    		user_discrim: "",
                    		avatar_url: "",
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

            this.logItemHTML = `<div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 auditLog-3jNbM6 da-auditLog marginBottom8-AtZOdT da-marginBottom8" style="flex: 1 1 auto;">
  <div class="header-GwIGlr da-header" aria-expanded="false" role="button" tabindex="0">
    <div class="avatar-_VZUJy da-avatar wrapper-3t9DeA da-wrapper" role="img" aria-hidden="true" style="width: 40px; height: 40px;">
      <img src="{{avatar_url}}" alt=" " class="avatar-VxgULZ da-avatar" aria-hidden="true">
    </div>
    <div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 timeWrap-2DasL6 da-timeWrap" style="flex: 1 1 auto;">
      <div class="overflowEllipsis-1PBFxQ da-overflowEllipsis flexChild-faoVW3 da-flexChild" style="flex: 1 1 auto; word-wrap: break-word; white-space: normal;">
        <span>
          <span class="userHook-3AdCBF da-userHook">
            <span>{{user_name}}</span>
            <span class="discrim-3rYTMj da-discrim">#{{user_discrim}}</span>
          </span>
          <div class="timestamp-1mruiI da-timestamp">{{timestamp}}</div>
        </span>
        <span>
          <span class="action">{{action}}</span>
          <span class="targetChannel-TrRFlx da-targetChannel">
            <strong>#{{channel_name}}</strong>
          </span>
        </span>
        <span>
          <span class="at">at</span>
          <img class="icon-27yU2q da-icon" src="{{guild_icon}}" alt="" style="display: inline; border-radius: 50%; width: 2em; height: 2em;" aria-hidden="true">
          <span class="targetChannel-TrRFlx da-targetChannel">
            <strong>{{guild_name}}</strong>
          </span>
        </span>
      </div>
    </div>
  </div>
</div>

`.trim();
            this.css = `.da-header {
    display:flex;
}
.da-flexChild {
    display: flex;
    flex-direction: column;
    color: var(--text-normal);
}
.da-userHook {
    color: var(--header-primary);
}
.da-targetChannel {
    margin-left: 6px;
}
.da-avatar {
    width:40px;
    border-radius: 50%;
}
.da-flexChild>span {
    display: flex;
    align-items: center;
    width:100%;
    margin-left:10px;
}
.da-icon {
    width:24px !important;
    height:24px !important;
    margin-left: 6px;
}
.da-timestamp {
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-left:6px;
}
.da-flexChild>span:nth-child(2) {
    margin-top:8px;
}
.da-log-list {
    overflow: hidden scroll;
    height: calc(100% + 20px);
    margin: 0px -8px -20px -16px;
}
.da-log-list>div {
    margin-bottom: 16px;
    padding:4px 16px 4px 16px;
}
.da-log-list>div:hover {
    background: #0001;
}`;
        }

        checkPatchI18n() {
            const sysLocale = DC.getLocale();
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

            this.DC = DC; // for easy debugging :-P

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
            
            DOM.addStyle(this.name, this.css);
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
            DOM.removeStyle(this.name);
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
                DCDataCache: DC.data4JSON(),
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
            this.contextMenuPatches.push(ContextMenu.patch("guild-context", (retVal, props) => {
                retVal.props.children.push(ContextMenu.buildItem({
                    id: "VCUJNContextmenuGuildVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({guildId: props.guild.id});
                    }
                }));
                if (this.settings.monitoring.guilds.includes(props.guild.id)) {
                    retVal.props.children.push(ContextMenu.buildItem({
                        id: "VCUJNContextmenuRemoveUserMonitoring",
                        label: this.getLocaleText("contextmenuRemoveMonitoring"), action: () => {
                            this.removeMonitoringList("guild", props.guild.id);
                        }
                    }));
                } else {
                    retVal.props.children.push(ContextMenu.buildItem({
                        id: "VCUJNContextmenuAddUserMonitoring",
                        label: this.getLocaleText("contextmenuAddMonitoring"), action: () => {
                            this.addMonitoringList("guild", props.guild.id);
                        }
                    }));
                }
            }));
        }

        patchVoiceChannelContextMenu() {
            this.contextMenuPatches.push(ContextMenu.patch("channel-context", (retVal, props) => {
                retVal.props.children.push(ContextMenu.buildItem({
                    id: "VCUJNContextmenuChannelVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({channelId: props.channel.id});
                    }
                }));
            }));
        }

        patchUserContextMenu() {
            this.contextMenuPatches.push(ContextMenu.patch("user-context", (retVal, props) => {
                retVal.props.children.push(ContextMenu.buildItem({
                    id: "VCUJNContextmenuUserVoiceLog",
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({userId: props.user.id});
                    }
                }));
                if (this.settings.monitoring.users.includes(props.user.id)) {
                    retVal.props.children.push(ContextMenu.buildItem({
                        id: "VCUJNContextmenuRemoveGuildMonitoring",
                        label: this.getLocaleText("contextmenuRemoveMonitoring"), action: () => {
                            this.removeMonitoringList("user", props.user.id);
                        }
                    }));
                } else {
                    retVal.props.children.push(ContextMenu.buildItem({
                        id: "VCUJNContextmenuAddGuildMonitoring",
                        label: this.getLocaleText("contextmenuAddMonitoring"), action: () => {
                            this.addMonitoringList("user", props.user.id);
                        }
                    }));
                }
            }));
        }

        showVoiceLogModal({userId, channelId, guildId}={}) {
            this.checkPatchI18n();
            let log = this.log;
            if (guildId !== undefined) log = log.filter(entry => entry.guildId === guildId);
            if (channelId !== undefined) log = log.filter(entry => entry.channelId === channelId || entry.lastChannelId === channelId);
            if (userId !== undefined) log = log.filter(entry => entry.userId === userId);
            const ce = React.createElement;
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
            Modals.showModal(this.getLocaleText("modalLogTitle"), ce("div",{className:"thin-31rlnD scrollerBase-_bVAAt da-log-list"},children), {cancelText: null});
        }

        checkChannelVisibility(channel) {
            return DC.can(DiscordPermissions.VIEW_CHANNEL, DC.getCurrentUser(), channel);
        }

        pushLog(logEntry) {
            this.log.unshift(logEntry);
            if (this.log.length > this.maxLogEntries) {
                this.log.pop();
            }
        }

        remoteNotification({msg, act, user, channel, lastChannel, guild}) {
            const replace = (str, uriescape = false) => {
                const strescape = (string) => { // copied from https://github.com/joliss/js-string-escape/blob/master/index.js
                    return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
                        // Escape all characters not included in SingleStringCharacters and
                        // DoubleStringCharacters on
                        // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
                        switch (character) {
                            case '"':
                                case "'":
                                case '\\':
                                return '\\' + character
                            // Four possible LineTerminator characters need to be escaped:
                            case '\n':
                                return '\\n'
                            case '\r':
                                return '\\r'
                            case '\u2028':
                                return '\\u2028'
                            case '\u2029':
                                return '\\u2029'
                        }
                    })
                };
                const replaceval = (val) => {
                    return uriescape ? encodeURIComponent(val) : strescape(val);
                };
                return str
                    .replace("{{user}}", replaceval(user.username))
                    .replace("{{channel}}", replaceval(channel.name))
                    .replace("{{guild}}", replaceval(guild.name))
                    .replace("{{message}}", replaceval(msg));
            };

            const url = replace(this.settings.remoteNotify.uri, true);
            const body = replace(this.settings.remoteNotify.body);
            //fetch(uri, {
            require("request")({ // use nodejs request to avoid cors problem
                url,
                headers: {
                    "content-type": this.settings.remoteNotify.contentType
                },
                body
            }, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                } else {
                    console.error("Webhook Request Error : ", error, response);
                }
            });
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
                const notificationMsg = this.getLocaleText(`notification${act}Message`, {
                    user: user.username,
                    channel: channel.name,
                    guild: guild.name
                });
                const notification = new Notification(notificationMsg, {
                    silent: this.settings.options.silentNotification,
                    icon: user.getAvatarURL()
                });
                if (this.settings.remoteNotify.enable) this.remoteNotification({msg: notificationMsg, act, user, channel, lastChannel, guild});
                if (act === "Join" || act === "Move") {
                    notification.addEventListener("click", () => {
                        DC.transitionToGuild(guild.id);
                    });
                }
            }
        }

        getLocaleText(id, args) {
            switch (DC.getLocale()) {
                case "zh-TW":
                    switch (id) {
                        case "config.monitoring.name":
                            return "監測清單";
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
                        case "config.options.name":
                            return "其他選項";
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
                        case "config.remoteNotify.name":
                            return "遠端通知(Webhook)";
                        case "config.remoteNotify.enable.name":
                            return "啟用 Webhook";
                        case "config.remoteNotify.uri.name":
                            return "網址";
                        case "config.remoteNotify.contentType.name":
                            return "HTTP Content-Type";
                        case "config.remoteNotify.body.name":
                            return "內容";
                        
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
                        case "config.options.name":
                            return "Other Options";
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
                        case "config.remoteNotify.name":
                            return "Remote Notification (Webhook)";
                        case "config.remoteNotify.enable.name":
                            return "Enable Webhook";
                        case "config.remoteNotify.uri.name":
                            return "Uri";
                        case "config.remoteNotify.contentType.name":
                            return "HTTP Content-Type";
                        case "config.remoteNotify.body.name":
                            return "Content Body";
                        
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
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/