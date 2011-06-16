# VoteBot

An Operator sends a DM to the VoteBot formated like "vote <topic of the vote>"
At this time the vote starts. People may vote either publicly by sending their vote to #vote as we have done before or secretly by sending a DM to the VoteBot.
When a vote is received in #vote it is acknowledged including its value to #vote.
When a vote is received privately it is acknowledged to #vote without its value and in a private message to the voter including its value. So everyone can check whether their vote was interpreted correctly.

At the end of a vote the VoteBot tallies the votes and send a Direct message to the person that started the vote for every single vote that was counted. And presents the sums to #vote.

So if we have an independent person that acts as an auditor for the votes, we can do so by simply having them start the vote, which is trivial to do.
As before reminders and vote closing is done automatically, so the auditing person really only has to start the vote and record the outcome.

here is how the actual voting syntax works (for those who have not participated before):
Simply send a message to #vote (or directly to the bot if a vote has been opened):

If you send a vote value to the bot (see below for values) it is your vote that is counted:

 * "aye" or "yes" or "oui" or "ja" means you vote aye
 * "naye" or "no" or "non" or "nein" means you vote naye
 * "abstain" or "enthaltung" or "enthalten" means that you abstain

proxy <UserName> <value> does a proxy vote for someone else. (<UserName> is the full name of your Proxy, <value> is the same as for your own vote.

There are a few additional commands:

 * "vote <topic> starts a vote on <topic>"
 * "cancel" cancels a vote (may only be used when a vote is running and by the person that started it
 * "quit" kills (and restarts) the votebot (may only be used when no vote is running)
 * "warn <number>" warns of an impending closure to the vote <number> seconds after the vote has been opened (may only be called when no vote is running, default is 90)
 * "close <number>" closes the vote <number> seconds after the warning (may only be called when no vote is running, default is 30)
 * "help" shows these commands (may only be called when no vote is running)
