function CGame(oData){
    var _bInitGame;
    
    var _iScore;
    var _iStage;
    var _iCurShot;
    var _iCurTargetAreaHit;
    var _iXRelativePos;

    var _oInterface;
    var _oParent;
    var _oGoalArea;
    var _oBall;
    var _oFade;
    var _oCameraContainer;
    var _oBg;
    var _oPlayer;
    var _oResult;
    var _deadline;
    var _finishTimer;
    var _finished;
    var _attempts;
    var _greens;
    var _hits;
    var _conditions;
    var _shotDrift;
    
    
    this._init = function(){
        
        _deadline = null;
        _finished = false;
        _attempts = _greens = _hits = 0;
        _conditions = null;
        _bInitGame=true;
        
        _iScore=0;
        _iStage = 1;
        _iCurShot = 1;
        
        playSound("crowd",1,true);
        
        _oCameraContainer = new createjs.Container();
        _oCameraContainer.x = CANVAS_WIDTH/2;
        _oCameraContainer.y = CANVAS_HEIGHT/2;
        _oCameraContainer.scaleX = _oCameraContainer.scaleY = 0.5;
        s_oStage.addChild(_oCameraContainer);

        var oSprite = s_oSpriteLibrary.getSprite('red_dolphins_stadium');
        _oBg = createBitmap(oSprite);
        _oBg.scaleX = CANVAS_WIDTH * 2 / oSprite.width;
        _oBg.scaleY = CANVAS_HEIGHT * 2 / oSprite.height;
        _oBg.regX = oSprite.width/2;
        _oBg.regY = oSprite.height/2;
        _oCameraContainer.addChild(_oBg); 

        _oGoalArea = new CGoalArea(_iStage-1, _oCameraContainer);

        var oSprite = s_oSpriteLibrary.getSprite('ball_holder');
        var _oBallHolder = createBitmap(oSprite);
        _oBallHolder.regX = oSprite.width/2;
        _oBallHolder.regY = oSprite.height/2;
        _oBallHolder.x = 78;
        _oBallHolder.y = 764;
        _oCameraContainer.addChild(_oBallHolder);

        _oBall = new CBall(0, 600, _oCameraContainer);

        _oPlayer = new CPlayer(s_oStage);

        _oInterface = new CInterface();
        _oInterface.setControlPos(_iStage-1);
        this._setConditions();


        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("Black").drawRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
        _oFade.alpha = 0;
        s_oStage.addChild(_oFade);
        _oFade.on("mousedown", function(){});

        RugbyTournament.ready(this);

    };

    this._calculateScore = function(iX, iY, iAreaHit){
        
        var iAreaScore = 0;
        switch(iAreaHit){
            case GREEN_TARGET:{
                    iAreaScore = GREEN_AREA_POINTS;
                    break;
            }
            case YELLOW_TARGET:{
                    iAreaScore = YELLOW_AREA_POINTS;
                    break;
            }
            case RED_TARGET:{
                    iAreaScore = RED_AREA_POINTS;
                    break;
            }
        }
        _iCurTargetAreaHit = iAreaHit;
        
        

        if(iAreaScore > 0){
            new CScoreText(iAreaScore, iX, iY + 105, _oCameraContainer);
        }

        _oInterface.refreshScore(_iScore);
        
    };
    
    this._shiftCamera = function(iX){
        var iLimitX = 250;
        if(Math.abs(iX) > iLimitX){
            if(iX>0){
                iX = iLimitX;
            } else {
                iX = -iLimitX;
            }
        }
        new createjs.Tween.get(_oCameraContainer).to({scaleX:0.85, scaleY:0.85, regX: iX}, 530, createjs.Ease.cubicOut);
        
        new createjs.Tween.get(_oCameraContainer).to({regY: -160}, 530, createjs.Ease.cubicOut);
    };
   
    this.playerShot = function(iXRelativePos, iYRelativePos){
        if (!this.canAim()) return;
        _iXRelativePos = iXRelativePos;
        _shotDrift = _conditions.wind * 0.044 * _conditions.distance / 36;
        var powerOffset = (_conditions.distance - 22) * 0.014;
        _oResult = _oGoalArea.getAreaHit(iXRelativePos + _shotDrift, iYRelativePos + powerOffset);
        _attempts++;
        switch (_oResult.areahit) {
            case GREEN_TARGET: _iScore += GREEN_AREA_POINTS; _greens++; _hits++; break;
            case YELLOW_TARGET: _iScore += YELLOW_AREA_POINTS; _hits++; break;
            case RED_TARGET: _iScore += RED_AREA_POINTS; _hits++; break;
        }
        _oPlayer.startPlay();
    };
   
    this.launchBall = function(){ 
        if (!this.canAim()) return;
        _iCurShot++;
        
        _oInterface.refreshShot(_iCurShot);
        
        var oResult = _oResult;

        this._shiftCamera(oResult.x);

        _oBall.launch(oResult.x, oResult.y, oResult.areahit, _iXRelativePos, oResult.stakehit, _shotDrift * GOAL_AREA[_iStage - 1].width / 2);

    };
   
    this.ballTouchTheTarget = function(iX, iY, iAreaHit){
        if (!this.canAim()) return;
        _oGoalArea.showArea(iAreaHit);
        
        this._calculateScore(iX, iY, iAreaHit);

        switch(iAreaHit){
            case GREEN_TARGET:{
                    playSound("goal",.4,false);
                    new CScoreText(TEXT_CENTER_GREEN, iX, iY, _oCameraContainer, "#17294d");
                    break;
            }
            case YELLOW_TARGET:{
                    new CScoreText(TEXT_CENTER_YELLOW, iX, iY, _oCameraContainer, "#17294d");
                    break;
            }
            case RED_TARGET:{
                    new CScoreText(TEXT_CENTER_RED, iX, iY, _oCameraContainer, "#17294d");
                    break;
            }
            case NULL_TARGET_POLE:{
                    playSound("miss_goal",1,false);
                    new CScoreText(TEXT_CENTER_NULL, iX, iY, _oCameraContainer, "#ff0000");
                    break;
            }
            case NULL_TARGET_LEFT:{
                    playSound("miss_goal",1,false);
                    new CScoreText(TEXT_WIDE_LEFT, iX, iY, _oCameraContainer, "#ff0000");
                    break;
            }
            case NULL_TARGET_RIGHT:{
                    playSound("miss_goal",1,false);
                    new CScoreText(TEXT_WIDE_RIGHT, iX, iY, _oCameraContainer, "#ff0000");
                    break;
            }
        }

        if(iAreaHit !== NULL_TARGET_POLE){
            _oCameraContainer.swapChildren(_oBall.getContainer(), _oGoalArea.getContainer());
        }
        
        
    };
    
    this.ballArrived = function(bStakeHit){
        if (!this.canAim()) return;
        _oBall.reset();
        
        if(_iCurShot > SHOTS_PER_STAGE){
            $(s_oMain).trigger("end_level",_iStage);
            _iCurShot = 1;
            _iStage = _iStage % NUM_STAGES + 1;
            this._changeStage();
        } else {
            _oParent._resetShot();
        }
        
        if(!bStakeHit){
            _oCameraContainer.swapChildren( _oGoalArea.getContainer(), _oBall.getContainer());
        }
        
    };
    
    this._changeStage = function(){
        playSound("game_over",1,false);
        
        $(s_oMain).trigger("start_level",_iStage);
        new createjs.Tween.get(_oFade).to({alpha: 1}, 160).call(function(){
            _oGoalArea.setGoalArea(_iStage-1);
            _oGoalArea.setAreaSprite(_iStage-1);

            _oGoalArea.stopAnim();
            _oInterface.resetShotsIndicator();
            _oInterface.setControlPos(_iStage-1);
            
            new createjs.Tween.get(_oFade).to({alpha: 0}, 170).call(function(){
                if (_oParent.canAim()) _oParent._levelSet();
            });
        });
        
    };
    
    this._resetShot = function(){
        _oGoalArea.stopAnim();
        new createjs.Tween.get(_oCameraContainer).to({scaleX:0.5, scaleY:0.5, regX: 0, regY:0}, 250, createjs.Ease.cubicOut).call(function(){
            if (_oParent.canAim()) _oParent._levelSet();
        });
    };
    
    this._setConditions = function () {
        // Draw a new signed wind for every kick, excluding the previous value.
        // The first kicks have only a light breeze; the range grows to +/-7 m/s.
        var maxWind = Math.min(7, 1 + Math.floor(_attempts / 3));
        var winds = [];
        for (var wind = -maxWind; wind <= maxWind; wind++) {
            if (!_conditions || wind !== _conditions.wind) winds.push(wind);
        }
        var nextWind = winds[Math.floor(Math.random() * winds.length)];
        _conditions = {
            distance: Math.min(57, 22 + Math.floor(_attempts / 5) * 7),
            wind: nextWind,
            gaugeSpeed: Math.max(850, SHOT_INDICATOR_SPEED - _attempts * 32)
        };
        _oInterface.refreshConditions(_conditions.distance, _conditions.wind);
    };

    this.getConditions = function () {
        return {distance: _conditions.distance, wind: _conditions.wind, gaugeSpeed: _conditions.gaugeSpeed};
    };

    this._levelSet = function(){
        
        //_oBall.reset();
        
        _oCameraContainer.scaleX = _oCameraContainer.scaleY = 0.5;
        _oCameraContainer.regX = _oCameraContainer.regY = 0;
        
        _oInterface.refreshStage(_iStage);
        if (_attempts > 0) this._setConditions();

        _oInterface.resetControl(_conditions.gaugeSpeed);
    };
    
    this.getStage = function(){
        return _iStage;
    };
    
    this.endGoalAnim = function(){
        _oGoalArea.stopAnim();
    };        
    
    this.unload = function(){
        RugbyAnnouncer.stop();
        _bInitGame = false;
        
        _oInterface.unload();
        clearTimeout(_finishTimer);
        RugbyTournament.close();
        
        createjs.Tween.removeAllTweens();
        s_oStage.removeAllChildren();

        _oFade.off("mousedown");   
    };
 
    this.onExit = function(){
        stopSound("crowd");
        
        $(s_oMain).trigger("show_interlevel_ad");
        $(s_oMain).trigger("end_session");
        this.unload();
        s_oMain.gotoMenu(); 
    };
    
    this.startRound = function () {
        if (!_bInitGame || _deadline !== null) return;
        RugbyTournament.close();
        _deadline = performance.now() + RugbyTournament.duration;
        _finishTimer = setTimeout(this.gameOver, RugbyTournament.duration);
        setVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME);
        this._levelSet();
    };

    this.canAim = function () {
        return _bInitGame && !_finished && _deadline !== null && performance.now() < _deadline;
    };

    this.gameOver = function () {
        if (!_bInitGame || _finished || _deadline === null) return;
        var remaining = _deadline - performance.now();
        if (remaining > 0) {
            clearTimeout(_finishTimer);
            _finishTimer = setTimeout(_oParent.gameOver, Math.ceil(remaining));
            return;
        }
        _finished = true;
        RugbyAnnouncer.stop();
        clearTimeout(_finishTimer);
        createjs.Tween.removeAllTweens();
        _oInterface.stopControl();
        _oInterface.refreshScore(_iScore);
        _oInterface.refreshTime(0);
        stopSound("crowd");
        playSound("game_over", 1, false);
        RugbyTournament.result(_oParent, {score: _iScore, attempts: _attempts, greens: _greens, hits: _hits});
    };

    this.restartGame = function () {
        this.unload();
        this._init();
    };

    this.update = function () {
        if (_deadline === null || _finished) return;
        var remaining = Math.max(0, _deadline - performance.now());
        _oInterface.refreshTime(remaining);
        if (remaining === 0) {
            this.gameOver();
            return;
        }
        _oPlayer.update();
    };

    s_oGame=this;
    
    SHOT_INDICATOR_SPEED = oData.shot_indicator_spd;
    DECREASE_SHOT_INDICATOR_SPEED = oData.decrease_shot_indicator_spd;

    SHOTS_PER_STAGE = oData.shots_per_stage;

    RED_AREA_POINTS = oData.red_area_points;
    YELLOW_AREA_POINTS = oData.yellow_area_points;
    GREEN_AREA_POINTS = oData.green_area_points;
    
    
    
    AD_SHOW_COUNTER = oData.ad_show_counter;
    
    _oParent=this;
    this._init();
}

var s_oGame;
