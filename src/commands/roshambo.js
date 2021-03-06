const { Client } = require('pg');
const respond = require('../utilities/responseUtilities').respond;
const respondAttachments = require('../utilities/responseUtilities').respondAttachments;

const postgres = new Client();
postgres.connect();

/**
 * Handles roshambo commands. Will handle the creation of games and the response to games
 * @param {*} payload The slack payload object
 * @param {*} h The hapi response toolkit
 * @param {*} move The move being made
 * @param {*} currentPlayer The player making the move
 * @param {*} targetPlayer The player being targeted by the move
 */
async function roshamboGame (payload, h, move, currentPlayer, targetPlayer) {
    // If you try and challenge yourself
    if (currentPlayer === targetPlayer) {
        return respond(payload, h, 'You cannot challenge yourself, fool! Get back to work!', false);
    }

    // If there already exists a game that you made against the same player (duplicate game)
    let duplicateGameResponse = await postgres.query('SELECT * FROM roshambo_games WHERE initiating_player = $1 AND target_player = $2;', [currentPlayer, targetPlayer]);
    if (duplicateGameResponse.rows.length > 0) {
        const duplicateGame = duplicateGameResponse.rows[0];
        return respond(payload, h, `You have already challenged <@${targetPlayer}> to a match. (Hint: You played \`${duplicateGame.initial_move}\`)`, false);
    }

    let gameToRespondToResponse = await postgres.query('SELECT * FROM roshambo_games WHERE initiating_player = $1 AND target_player = $2;', [targetPlayer, currentPlayer]);
    if (gameToRespondToResponse.rows.length > 0) {
        const gameToRespondTo = gameToRespondToResponse.rows[0];
        // Remove the game from roshambo_games
        await postgres.query('DELETE FROM roshambo_games WHERE initiating_player = $1 AND target_player = $2;', [targetPlayer, currentPlayer]);

        switch (gameToRespondTo.initial_move) {
        case 'rock':
            if (move === 'rock') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, null]);
                return respond(payload, h, `Your rocks clash together, resulting in a tie between <@${gameToRespondTo.initiating_player}> and <@${gameToRespondTo.target_player}>!`, true);
            }
            if (move === 'paper') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.target_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s rock gets covered by <@${gameToRespondTo.target_player}>'s paper, which somehow is a victory!`, true);
            }
            if (move === 'scissors') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.initiating_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s rock smashes <@${gameToRespondTo.target_player}>'s scissors to smithereens!`, true);
            }
            break;
        case 'paper':
            if (move === 'rock') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.initiating_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s paper covers <@${gameToRespondTo.target_player}>'s rock, which somehow is a victory!`, true);
            }
            if (move === 'paper') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, null]);
                return respond(payload, h, `Your papers flutter in the wind, resulting in a tie between <@${gameToRespondTo.initiating_player}> and <@${gameToRespondTo.target_player}>!`, true);
            }
            if (move === 'scissors') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.target_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s paper is sliced into oragami by <@${gameToRespondTo.target_player}>'s scissors!`, true);
            }
            break;
        case 'scissors':
            if (move === 'rock') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.target_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s scissors get smashed to smithereens by <@${gameToRespondTo.target_player}>'s rock!`, true);
            }
            if (move === 'paper') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, gameToRespondTo.initiating_player]);
                return respond(payload, h, `<@${gameToRespondTo.initiating_player}>'s scissors slice <@${gameToRespondTo.target_player}> paper into oragami!`, true);
            }
            if (move === 'scissors') {
                await postgres.query('INSERT INTO roshambo_stats(initiating_player, target_player, initial_move, target_move, winner) VALUES($1, $2, $3, $4, $5);', [gameToRespondTo.initiating_player, gameToRespondTo.target_player, gameToRespondTo.initial_move, move, null]);
                return respond(payload, h, `Your scissors clang together like swords in battle, resulting in a tie between <@${gameToRespondTo.initiating_player}> and <@${gameToRespondTo.target_player}>!`, true);
            }
            break;
        }
    }

    // Else, no game exists, so let's make one!
    await postgres.query('INSERT INTO roshambo_games(initiating_player, target_player, initial_move) VALUES($1, $2, $3) RETURNING *;', [currentPlayer, targetPlayer, move]);
    return respond(payload, h, `<@${currentPlayer}> has challenged <@${targetPlayer}> to a roshambo match! Respond with \`/roshambo @${payload.user_name} [rock|paper|scissors]\``, true);
}

/**
 * Gets statistics on a certain users roshambo games
 * @param {*} payload The slack payload object
 * @param {*} h The hapi response toolkit
 * @param {*} userId The id of the player to get stats on
 */
async function roshamboStats (payload, h, userId) {
    const statsResponse = await postgres.query(`
        SELECT (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 OR target_player = $1) AND (winner = $1)) AS wins,
        (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 OR target_player = $1) AND (winner is NULL)) AS ties,
        (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 OR target_player = $1) AND (winner != $1)) AS losses,
        (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 AND initial_move = 'rock') OR (target_player = $1 AND target_move = 'rock')) AS rocks,
        (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 AND initial_move = 'paper') OR (target_player = $1 AND target_move = 'paper')) AS papers,
        (SELECT COUNT(*) FROM roshambo_stats WHERE (initiating_player = $1 AND initial_move = 'scissors') OR (target_player = $1 AND target_move = 'scissors')) AS scissors;
    `, [userId]);
    if (statsResponse.rows[0]) {
        const stats = statsResponse.rows[0];
        return respondAttachments(payload, h, [
            {
                fallback: 'Statistics for user',
                color: '#36a64f',
                pretext: `Statistics for <@${userId}>`,
                fields: [
                    {
                        title: 'Wins / Losses / Ties',
                        value: `${stats.wins} / ${stats.losses} / ${stats.ties}`,
                        short: false
                    },
                    {
                        title: 'Rocks / Papers / Scissors',
                        value: `${stats.rocks} / ${stats.papers} / ${stats.scissors}`,
                        short: false
                    }
                ],
                footer: 'Claybot'
            }
        ], false);
    } else {
        return respond(payload, h, `There are no stats yet for <@${userId}>`, false);
    }
}

async function roshamboHelp (payload, h) {
    return respondAttachments(payload, h, [
        {
            fallback: 'Usage message for /roshambo',
            color: '#36a64f',
            pretext: 'The following commands are available for /roshambo',
            fields: [
                {
                    title: '/roshambo _@username_ _move_',
                    value: 'Challenges _@username_ to a game of Rock, Paper, Scissors\n_Example:_ `/roshambo @cbenson paper`',
                    short: false
                },
                {
                    title: '/roshambo stats _@username_',
                    value: 'List out the stats for _@username_. Defaults to yourself if _@username_ is not specified',
                    short: false
                },
                {
                    title: '/roshambo clear _@username_',
                    value: 'Clears the game between you and _@username_, if there is one. Useful if you accidentally started a game!',
                    short: false
                }
            ],
            footer: 'Claybot'
        }
    ], false);
}

async function roshamboClear (payload, h, targetPlayer) {
    let currentPlayer = payload.user_id;
    let gameToClearResponse = await postgres.query('SELECT * FROM roshambo_games WHERE initiating_player = $1 AND target_player = $2;', [currentPlayer, targetPlayer]);
    if (gameToClearResponse.rows[0]) {
        await postgres.query('DELETE FROM roshambo_games WHERE initiating_player = $1 AND target_player = $2;', [currentPlayer, targetPlayer]);
        return respond(payload, h, `Game cleared with <@${targetPlayer}>!`, false);
    }
    return respond(payload, h, `There is not currently a game between you and <@${targetPlayer}>!`, false);
}

/**
 * Handles roshambo commands. Will handle the creation of games and the response to games, as well as `stats` commands
 * @param {*} payload The slack payload object
 * @param {*} h The hapi response toolkit
 */
async function roshambo (payload, h) {
    const commandText = payload.text;
    const roshamboHelpRegex = /help/igm;
    const roshamboGameRegex = /<@(\w+)?\|?(\w+)?>\s(rock|paper|scissors)/igm;
    const roshamboStatsRegex = /stats\s*(<@(\w+)\|?\w*>)?/igm;
    const roshamboClearRegex = /clear\s*(<@(\w+)\|?\w*>)/igm;

    if (roshamboHelpRegex.test(commandText)) {
        return roshamboHelp(payload, h);
    } else if (roshamboGameRegex.test(commandText)) {
        roshamboGameRegex.lastIndex = 0; // reset regex due to /g flag
        const matches = roshamboGameRegex.exec(commandText);

        const move = matches[3].toLowerCase();
        const currentPlayer = payload.user_id;
        const targetPlayer = matches[1];
        return roshamboGame(payload, h, move, currentPlayer, targetPlayer);
    } else if (roshamboStatsRegex.test(commandText)) {
        roshamboStatsRegex.lastIndex = 0;
        const matches = roshamboStatsRegex.exec(commandText);

        const userId = matches[2] || payload.user_id;

        return roshamboStats(payload, h, userId);
    } else if (roshamboClearRegex.test(commandText)) {
        roshamboClearRegex.lastIndex = 0;
        const matches = roshamboClearRegex.exec(commandText);

        const userId = matches[2];

        return roshamboClear(payload, h, userId);
    } else {
        return roshamboHelp(payload, h);
    }
}

module.exports = roshambo;
