/* Shot announcements are on the HUD layer so camera zoom never distorts the lettering. */
function CScoreText(value, x, y, parentContainer, color) {
    var numeric = typeof value === "number";
    var label = numeric ? "+" + value : String(value);
    if (!numeric) RugbyAnnouncer.play(label);
    var perfect = label === "PERFECT!";
    var great = label === "GREAT!";
    var missed = label === "MISS!" || label === "POST HIT!";
    var accent = numeric || perfect ? "#ffd65c" : great ? "#6ff6ff" : missed ? "#ff5475" : "#ff3455";
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var layer = new createjs.Container();
    layer.name = numeric ? "shot-points" : "shot-announcement";
    layer.mouseEnabled = false;
    layer.mouseChildren = false;
    layer.x = CANVAS_WIDTH / 2;
    layer.y = numeric ? 428 : 335;
    layer.alpha = 0;
    s_oStage.addChild(layer);

    if (!numeric) {
        var banner = new createjs.Shape();
        banner.graphics.beginLinearGradientFill(["rgba(9,13,23,0)", "rgba(9,13,23,.94)", "rgba(9,13,23,0)"],
            [0, .5, 1], -300, 0, 300, 0)
            .moveTo(-292, -59).lineTo(300, -59).lineTo(274, 71).lineTo(-310, 71).closePath();
        banner.graphics.setStrokeStyle(3).beginStroke(accent).moveTo(-220, -53).lineTo(236, -53)
            .moveTo(-235, 66).lineTo(220, 66);
        layer.addChild(banner);
        var rays = new createjs.Shape();
        rays.graphics.setStrokeStyle(3).beginStroke(accent);
        for (var ray = 0; ray < 8; ray++) {
            var angle = ray * Math.PI / 4;
            rays.graphics.moveTo(Math.cos(angle) * 230, Math.sin(angle) * 48)
                .lineTo(Math.cos(angle) * 257, Math.sin(angle) * 70);
        }
        layer.addChild(rays);
    }

    var size = numeric ? 66 : perfect ? 79 : label.length > 8 ? 71 : 94;
    var font = "italic " + size + "px " + PRIMARY_FONT;
    function textLayer(fill, outline, offsetY) {
        var text = new createjs.Text(label, font, fill);
        text.textAlign = "center";
        text.textBaseline = "middle";
        text.y = offsetY;
        text.outline = outline;
        layer.addChild(text);
        return text;
    }
    var glow = textLayer(accent, numeric ? 9 : 11, 3);
    glow.shadow = new createjs.Shadow(accent, 0, 0, perfect ? 20 : 12);
    textLayer("#080c15", numeric ? 7 : 9, 6);
    textLayer("#080c15", numeric ? 5 : 7, 0);
    textLayer(numeric || perfect ? "#fff4b0" : "#ffffff", 0, 0);

    if (!numeric && perfect && !reducedMotion) {
        for (var i = 0; i < 12; i++) {
            var spark = new createjs.Shape();
            spark.graphics.beginFill(i % 2 ? "#fff4bb" : accent).drawPolyStar(0, 0, i % 3 ? 4 : 6, 4, .65, 0);
            var direction = i * Math.PI / 6;
            spark.x = Math.cos(direction) * 140;
            spark.y = Math.sin(direction) * 30;
            layer.addChildAt(spark, 0);
            createjs.Tween.get(spark).to({
                x: Math.cos(direction) * 280,
                y: Math.sin(direction) * 105,
                rotation: 100,
                alpha: 0
            }, 680, createjs.Ease.quadOut);
        }
    }

    this.unload = function () {
        createjs.Tween.removeTweens(layer);
        s_oStage.removeChild(layer);
    };
    var self = this;
    if (reducedMotion) {
        createjs.Tween.get(layer).to({alpha: 1}, 90).wait(550).to({alpha: 0}, 150).call(self.unload);
    } else {
        layer.scaleX = layer.scaleY = numeric ? .75 : .6;
        createjs.Tween.get(layer).wait(numeric ? 65 : 0)
            .to({alpha: 1, scaleX: 1.10, scaleY: 1.10}, 150, createjs.Ease.quadOut)
            .to({scaleX: 1, scaleY: 1}, 110, createjs.Ease.sineOut)
            .wait(320)
            .to({alpha: 0, y: layer.y - 18}, 240, createjs.Ease.quadIn)
            .call(self.unload);
    }
}
