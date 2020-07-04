/**
 * @name VoiceChannelUserJoinNotification
 * @authorLink https://saru.moe
 * @website https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification
 * @source https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
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

module.exports = (() => {
    const config = {info:{name:"VoiceChannelUserJoinNotification",authors:[{name:"DannyAAM",discord_id:"275978619354873856",github_username:"danny8376",twitter_username:"DannyAAMtw"}],version:"0.1.0",description:"A simple BetterDiscord plugin for you to monitor specific users joining voice channels in spcific guilds.",github:"https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification",github_raw:"https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js"},changelog:[{title:"Rewritten",items:["Rewritten with ZeresPluginLibrary as BDv2 Style Plugin."]}],main:"index.js",defaultConfig:[{type:"category",id:"monitoring",name:"i18n:settingsMonitoringTitle",collapsible:false,shown:true,settings:[{type:"textbox",id:"guilds",name:"i18n:settingsGuildsTitle",note:"i18n:settingsGuildsNote",value:"000000000000000000#Example"},{type:"textbox",id:"users",name:"i18n:settingsUsersTitle",note:"i18n:settingsUsersNote",value:"000000000000000000#Example,000000000000000000"}]},{type:"category",id:"options",name:"i18n:settingsOptionsTitle",collapsible:false,shown:true,settings:[{type:"switch",id:"allGuilds",name:"i18n:settingsAllGuilds",note:"",value:false},{type:"switch",id:"notifyLeave",name:"i18n:settingsNotifyLeave",note:"",value:false},{type:"switch",id:"silentNotification",name:"i18n:settingsSilentNofification",note:"",value:false},{type:"switch",id:"suppressInDnd",name:"i18n:settingsSuppressInDnd",note:"",value:true},{type:"switch",id:"logHotkey",name:"i18n:settingsLogHotkey",note:"",value:true}]}]};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {PluginUtilities, DiscordModules, DiscordSelectors, ReactTools, DOMTools, Modals, Utilities, DiscordClasses, WebpackModules} = Api;

    return class VoiceChannelUserJoinNotification extends Plugin {
        constructor() {
            super();

            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.afkChannels = [];

            this.itemHTML = `<div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 auditLog-3jNbM6 da-auditLog marginBottom8-AtZOdT da-marginBottom8" style="flex: 1 1 auto;">
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
        <span class="userHook-3AdCBF da-userHook"><span>{{user_name}}</span><span class="discrim-3rYTMj da-discrim">#{{user_discrim}}</span></span> {{action}} <span class="targetChannel-TrRFlx da-targetChannel"><strong>#{{channel_name}}</strong></span> @ <img class="icon-27yU2q da-icon" src="{{guild_icon}}" alt="" style="display:inline;width:2em;height:2em;" aria-hidden="true"><span class="targetChannel-TrRFlx da-targetChannel"><strong>#{{guild_name}}</strong></span>
      </div>
      <div class="timestamp-1mruiI da-timestamp">{{timestamp}}</div>
    </div>
  </div>
</div>

`;
        }

        expandDCFuncs() {
            const funcs = ["getVoiceStates", "getUser", "getChannel", "getGuild", "getGuilds", "getCurrentUser", "getStatus", "transitionToGuild", "getLocaleInfo"];
            funcs.forEach(funcName => {
                 this[funcName] = ZeresPluginLibrary.WebpackModules.getByProps(funcName)[funcName];
            });
        }

        async onStart() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.expandDCFuncs();

            this.log = [];

            let lastStates = [];

            const localUser = this.getCurrentUser();

            this.parseMatchlist();

            this.update = setInterval(() => {

                if (!this.settings.options.allGuilds && this.monitoringGuilds.length == 0) return;
                if (this.monitoringUsers.length == 0) return;
            
                const allGuilds = [];
                this.afkChannels = [];
            
                Object.values(this.getGuilds()).forEach(g => {
                    allGuilds.push(g.id);
                    if (g.afkChannelId) this.afkChannels.push(g.afkChannelId);
                });
            
                const targetGuilds = this.settings.allGuilds ? allGuilds : this.monitoringGuilds;
            
                const newStates = targetGuilds.map(gid => this.getVoiceStates(gid)).reduce((a, v) => {return {...v, ...a}});

                for(let id in newStates) {

                    if(localUser.id == id) continue;
                    if(!this.monitoringUsers.includes(id)) continue;

                    if(lastStates[id] == undefined) {
                        const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Join", user, channel, guild});
                        }
                    } else {

                        if(lastStates[id].channelId != newStates[id].channelId) {

                            const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);

                            if(user && channel) {
                                const guild = this.getGuild(channel.guild_id);
                                this.notificationAndLog({act: "Move", user, channel, guild});
                            }

                            continue;

                        }

                    }

                }

                for(let id in lastStates) {
                    if(localUser.id == id) continue;
                    if(!this.monitoringUsers.includes(id)) continue;

                    if(newStates[id] == undefined && id != localUser.id) {
                        const user = this.getUser(id), channel = this.getChannel(lastStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Leave", user, channel, guild});
                        }
                    }
                }

                lastStates = newStates;

            }, 500);

            this.focused = true;

            this.focus = () => this.focused = true;
            this.unfocus = () => this.focused = false;

            window.addEventListener("focus", this.focus);
            window.addEventListener("blur", this.unfocus);

            this.onKeyDown = e => {

                if(this.settings.options.logHotkey && e.altKey && e.key == "v") {

                    this.showVoiceLogModal();

                    /*
                    if(document.getElementById("vcn-log")) return;

                    const list = NeatoLib.UI.createBasicScrollList("vcn-log", "Voice Notification Log", { width : 400, height : 500 });

                    if(this.log.length > 50) this.log.splice(50, this.log.length);

                    for(let i = 0; i < this.log.length; i++) {
                        list.scroller.insertAdjacentHTML("afterbegin", `
                    
                        <div class="message-group hide-overflow">
                            <div class="avatar-large stop-animation" style="background-image: url(${this.log[i].avatar});"></div>
                            <div class="comment">
                                <div class=NeatoLib.Modules.get("message").message.split(" ").join("")>
                                    <div class="body">
                                        <h2 class="old-h2"><span class="username-wrapper"><strong class="user-name" style="color: white">${this.log[i].username}</strong></span><span class="highlight-separator"> - </span><span class="timestamp">${this.log[i].timestamp}</span></h2>
                                        <div class="message-text">
                                            <div class=NeatoLib.Modules.get("markup").markup.split(" ").join("")>${this.log[i].text}.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                        `);
                    }
                   */

                }

            };

            document.addEventListener("keydown", this.onKeyDown);
        }

        onStop() {
            clearInterval(this.update);
            window.removeEventListener("focus", this.focus);
            window.removeEventListener("blur", this.unfocus);
            document.removeEventListener("keydown", this.onKeyDown);
            this.saveSettings();
        }

        getLocalStatus() {
            return this.getStatus(this.getCurrentUser().id);
        }

        parseMatchlist() {
            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.settings.monitoring.guilds.split(",").forEach(l => {
                this.monitoringGuilds.push(l.split("#")[0].trim());
            });
            this.settings.monitoring.users.split(",").forEach(l => {
                this.monitoringUsers.push(l.split("#")[0].trim());
            });
        }

        showVoiceLogModal() {
            const ce = DiscordModules.React.createElement;
            const AuditLog = DiscordClasses.AuditLog;
            const children = this.log.map(log => {
                const user = this.getUser(log.user_id);
                const channel = this.getChannel(log.channel_id);
                const guild = this.getGuild(log.guild_id);
                return ce("div", { dangerouslySetInnerHTML:{ __html: Utilities.formatString(this.itemHTML, {
                    user_name: DOMTools.escapeHTML(user.username),
                    user_discrim: user.discriminator,
                    avatar_url: user.getAvatarURL(),
                    action: DOMTools.escapeHTML(this.getLocaleText(`notification${log.act}`)),
                    channel_name: DOMTools.escapeHTML(channel.name),
                    guild_icon: guild.getIconURL(),
                    guild_name: DOMTools.escapeHTML(guild.name),
                    timestamp: DOMTools.escapeHTML(log.timestamp)
                }) } });
            });
            Modals.showModal("Voice Notification Log", children, {cancelText: null});
        }

        notificationAndLog({act, user, channel, guild}) {
            //this.log.push({avatar: user.getAvatarURL(), username: user.username , timestamp : new Date().toLocaleTimeString(), text : this.getLocaleText(`notification${act}Log`, {channel: channel.name, guild: guild.name})});
            this.log.push({user_id: user.id, channel_id: channel.id, guild_id: guild.id, timestamp: new Date().toLocaleTimeString(), act});
            if(!(this.settings.options.suppressInDnd && this.getLocalStatus() == "dnd") && !this.afkChannels.includes(channel.id) && (act !== "Leave" || this.settings.options.notifyLeave)) {
                const notification = new Notification(this.getLocaleText(`notification${act}Message`, {user: user.username, channel: channel.name, guild: guild.name}), {silent: this.settings.options.silentNotification, icon: user.getAvatarURL()});
                if (act === "Join" || act === "Move") {
                    notification.addEventListener("click", () => {
                        this.transitionToGuild(guild.id);
                    });
                }
            }
        }

        getLocaleText(id, args) {
            switch (this.getLocaleInfo().code) {
                case "zh-TW":
                    switch (id) {
                        case "settingsGuildsTitle":
                            return "檢查伺服器ID ( , 分隔，ID後可加#註解)";
                        case "settingsGuildsNote":
                            return "伺服器ID，多組時使用 , 來分隔，ID後可加#註解";
                        case "settingsUsersTitle":
                            return "檢查使用者 ( , 分隔，ID後可加#註解)";
                        case "settingsUsersNote":
                            return "使用<使用者ID>，多組時使用 , 來分隔，ID後可加#註解";
                        case "settingsAllGuilds":
                            return "檢查所有已加入伺服器";
                        case "settingsNotifyLeave":
                            return "通知退出語音頻道";
                        case "settingsSilentNofification":
                            return "使用無聲通知";
                        case "settingsSuppressInDnd":
                            return "勿擾模式時關閉通知";
                        case "settingsLogHotkey":
                            return "啟用 Alt+V 開啟記錄視窗";
                        
                        case "notificationJoinMessage":
                            return `${args.user} 進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoinLog":
                            return `進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "進入了";
                        case "notificationMoveMessage":
                            return `${args.user} 移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMoveLog":
                            return `移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "移動到";
                        case "notificationLeaveMessage":
                            return `${args.user} 離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveLog":
                            return `離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "離開";
                    }
                case "en-US":
                default:
                    switch (id) {
                        case "settingsGuildsTitle":
                            return "Monitoring Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsGuildsNote":
                            return "Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsUsersTitle":
                            return "Monitoring User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsUsersNote":
                            return "User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsAllGuilds":
                            return "Monitor all guilds";
                        case "settingsNotifyLeave":
                            return "Notify user leaves";
                        case "settingsSilentNofification":
                            return "Silent notifications";
                        case "settingsSuppressInDnd":
                            return "Suppress notifications while in Do Not Disturb";
                        case "settingsLogHotkey":
                            return "Enable Alt+V Log Panel";
                        
                        case "notificationJoinMessage":
                            return `${args.user} joined ${args.channel} @ ${args.guild}`;
                        case "notificationJoinLog":
                            return `Joined ${args.channel} @ ${args.guild}`;
                        case "notificationMoveMessage":
                            return `${args.user} moved to ${args.channel} @ ${args.guild}`;
                        case "notificationMoveLog":
                            return `Moved to ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveMessage":
                            return `${args.user} left ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveLog":
                            return `Left ${args.channel} @ ${args.guild}`;
                    }
            }
        }


        buildSetting(data) {
            const setting = super.buildSetting(data);
            if (setting !== null) {
                if (setting.name.startsWith("i18n:")) setting.name = this.getLocaleText(setting.name.substr(5));
                if (setting.note.startsWith("i18n:")) setting.note = this.getLocaleText(setting.note.substr(5));
            }
            return setting;
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener(this.parseMatchlist.bind(this));
            return panel.getElement();
        }

    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/