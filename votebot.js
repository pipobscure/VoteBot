#!/usr/bin/node
;
/*
 * © 2011 by YOUSURE Tarifvergleich GmbH
 * Author: Philipp Dunkel <p.dunkel@durchblicker.at>
 */

var opts = {
	rooms:[ '#agm', '#sgm' ],
	warn:90,
	close:30
};

require.paths.unshift(__dirname+"/lib");

var irc=new require("irc");
irc = new irc({ server:"irc.cacert.org", nick:'ProtoVoteBot', encoding:"UTF-8", user: { username:"VoteBot", realname:"VoteBot" } });

if (irc) irc.connect(function() {
	irc.listenOnce("mode",function() {
		irc.listenOnce("nick", function(msg) {
			irc.join("#vote");
			for (var idx=0; idx<opts.rooms.length; idx++) irc.join(opts.rooms[idx]);
			irc.privmsg("ChanServ","OP #vote VoteBot");
			irc.addListener("privmsg",handleMessage);
			irc.topic("#vote","Waiting for a Vote to be called");
		});
		irc.privmsg("NickServ","IDENTIFY VoteBot VoteBot");
	});
});

var vote = false;

var handleMessage = function(message) {
	var parts;
	var value;
	switch (message.params[0]) {
		case '#vote' : {
			if (!vote) {
				irc.privmsg("#vote", "Sorry "+message.person.nick+", there is currently no active vote!");
			} else {
				value = voteValue(message.person.nick, message.params[1]);
				if (!value || isNaN(value.value)) {
					irc.privmsg("#vote", "Sorry "+message.person.nick+", I did not understand your vote!");
				} else {
					vote.votes[value.voter] = value.value;
					if (value.actor === value.voter) {
						irc.privmsg("#vote", "Thanks "+value.actor+", I count your vote as "+value.name);
					} else {
						irc.privmsg("#vote", "Thanks "+value.actor+", I count the vote for "+value.voter+" vote as "+value.name);
					}
				}
			}
			break;
		}
		case 'VoteBot' : {
			if (vote) {
				if (message.params.length > 1) {
					if (message.params[1].match(/^\s*cancel\s*$/i)) {
						if (message.person.nick === vote.master) {
							notify("\u0001ACTION "+message.person.nick+" has canceled the vote on: "+vote.topic+"\u0001");
							clearTimeout(vote.timer);
							vote = false;
							irc.topic("#vote","Waiting for a Vote to be called");
						} else {
							irc.privmsg(message.person.nick, "Sorry, only the person who started a vote can cancel it!");
						}
					} else {
						value = voteValue(message.person.nick, message.params[1]);
						if (!value || isNaN(value.value)) {
							irc.privmsg("#vote", "Sorry "+message.person.nick+", I did not understand your vote!");
							irc.privmsg(message.person.nick, "Sorry "+message.person.nick+", I did not understand your vote!");
						} else {
							vote.votes[value.voter] = value.value;
							if (value.actor === value.voter) {
								irc.privmsg("#vote", "Thanks "+value.actor+", I counted your vote");
								irc.privmsg(message.person.nick, "Thanks "+value.actor+", I count your vote as "+value.name);
							} else {
								irc.privmsg("#vote", "Thanks "+value.actor+", I counted the vote for "+value.voter);
								irc.privmsg(message.person.nick, "Thanks "+value.actor+", I count the vote for "+value.voter+" vote as "+value.name);
							}
						}
					}
				} else {
					irc.privmsg(message.person.nick, "Sorry, you do have to tell me what to do!");
				}
				break;
			}
			parts = String(message.params[1]).split(/\s+/);
			parts[0] = parts[0].toLowerCase();
			switch(parts[0]) {
				case "help" : {
					var cmd = [
						"\u0001ACTION Commands:\u0001",
						"\u0001ACTION VOTE <TOPIC> : Start a Vote\u0001",
						"\u0001ACTION CANCEL       : Cancel a Vote\u0001",
						"\u0001ACTION WARN <SECS>  : Set the time at which to warn of close\u0001",
						"\u0001ACTION CLOSE <SECS> : Set the time at which to close the vote\u0001"
					];
					irc.privmsg(message.person.nick, cmd.join("\n"));
					break;
				}
				case "warn" : {
					value = parseInt(parts[1],10);
					if (isNaN(value)) {
						irc.privmsg(message.person.nick, "Sorry, warn requires a numeric parameter!");
					} else {
						opts.warn = value;
						irc.privmsg(message.person.nick, "I will warn of impending close "+opts.warn+" seconds after opening the vote!");
					}
					break;
				}
				case "close" : {
					value = parseInt(parts[1],10);
					if (isNaN(value)) {
						irc.privmsg(message.person.nick, "Sorry, close requires a numeric parameter!");
					} else {
						opts.close = value;
						irc.privmsg(message.person.nick, "I will close the vote "+opts.close+" seconds after the warning!");
					}
					break;
				}
				case "vote" : {
					console.log(parts.join(" | "));
					parts.shift();
					vote = { topic:parts.join(" "), aye:0, nay:0, abs:0, votes:{}, timer:setTimeout(warnTime, opts.warn * 1000), master:message.person.nick };
					irc.topic("#vote","Please Vote on: "+vote.topic);
					notify([
						message.person.nick+" has started a vote on: "+vote.topic,
						"\u0001ACTION please vote on: "+vote.topic+"\u0001"
					]);
					break;
				}
				case "quit" : {
					console.log(parts.join(" | "));
					parts.shift();
					notify(message.person.nick+" has stopped the VoteBot");
					irc.quit("Goodbye!");
					process.nextTick(function() {
						process.exit(0);
					});
					break;
				}
				case "cancel" : {
					irc.privmsg(message.person.nick, "Sorry, there is currently no active vote!");
					break;
				}
				default : {
					irc.privmsg(message.person.nick, "Sorry, I don't understand the command "+parts[0]);
					break;
				}
			}
			break;
		}
	}
};

var voteValue = function(actor, txt) {
	var voter = actor;
	var value = undefined;
	var valname;
	if (txt.match(/^\s*proxy\s/i)) {
		parts = txt.split(/\s+/);
		if (parts.length === 3) {
			voter = parts[1];
			value = parts[2];
		}
	} else {
		value = txt.replace(/^\s*|\s*$/g,"");
	}
	if (!value) {
		return undefined;
	} else {
		value = value.toLowerCase();
		switch(value) {
			case "aye":
			case "yes":
			case "oui":
			case "ja": {
				return { voter:voter, actor:actor, name:"AYE", value:1 };
			}
			case "naye":
			case "nay":
			case "no":
			case "non":
			case "nein": {
				return { voter:voter, actor:actor, name:"NAYE", value:-1 };
			}
			case "abstain":
			case "enthaltung":
			case "enthalten":
			case "abs": {
				return { voter:voter, actor:actor, name:"ABSTAIN", value:0 };
			}
		}
	}
	return undefined;
};

var closeVote = function() {
	var closed = vote;
	vote = false;
	irc.topic("#vote","Waiting for a Vote to be called");
	var item;
	closed.aye=closed.nay=closed.abs=0;
	irc.privmsg(closed.master, "\u0001ACTION tyllying the results for \""+closed.topic+"\"\u0001");
	for (item in closed.votes) {
		if (closed.votes.hasOwnProperty(item)) {
			switch(closed.votes[item]) {
				case 1 : 
					closed.aye+=1;
					irc.privmsg(closed.master, "\u0001ACTION counting "+item+" AYE\u0001");
					break;
				case -1 : 
					closed.nay+=1;
					irc.privmsg(closed.master, "\u0001ACTION counting "+item+" NAYE\u0001");
					break;
				default : 
					irc.privmsg(closed.master, "\u0001ACTION counting "+item+" ABSTAIN\u0001");
					closed.abs+=1;
					break;
			}
		}
	}

	irc.privmsg(closed.master, "\u0001ACTION has totaled the results for \""+closed.topic+"\"\u0001");
	irc.privmsg(closed.master, "\u0001ACTION ---        AYE:     "+closed.aye+"\u0001");
	irc.privmsg(closed.master, "\u0001ACTION ---        NAYE:    "+closed.nay+"\u0001");
	irc.privmsg(closed.master, "\u0001ACTION ---        ABSTAIN: "+closed.abs+"\u0001");
	notify([
		"\u0001ACTION has totaled the results for \""+closed.topic+"\"\u0001",
		"\u0001ACTION ---        AYE:     "+closed.aye+"\u0001",
		"\u0001ACTION ---        NAYE:    "+closed.nay+"\u0001",
		"\u0001ACTION ---        ABSTAIN: "+closed.abs+"\u0001"
	]);
};
var warnTime = function() {
	notify("\u0001ACTION Voting on \""+vote.topic+"\" will end in "+opts.close+" seconds!\u0001");
	vote.timer = setTimeout(closeVote, opts.close * 1000);
};
var notify = function(lines) {
	if (lines.constructor !== Array) lines = [ lines ];
	var ridx;
	var lidx;
	for (lidx=0; lidx<lines.length; lidx++) {
		irc.privmsg("#vote", lines[lidx]);
	}
	for (ridx=0; ridx<opts.rooms.length; ridx++) {
		for (lidx=0; lidx<lines.length; lidx++) {
			irc.privmsg(opts.rooms[ridx], lines[lidx]);
		}
	}
};

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

