
ServerEvents.loaded(event => {
    ScoreboardUtils.removeScoreboard(event.server, 'my_mission_scores');
});