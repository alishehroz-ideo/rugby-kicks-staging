function CInterface(){
    var _bCanPlay;
    
    var _iCurState;
    
    var _aShotIndicator;
    
    var _oAudioToggle;
    var _oHud;
    var _oParent;
    var _oShapeKeyListener;
    var _oStageText;
    var _oStageBg;
    var _oTopBar;
    var _oRightBar;
    var _oShotsIndicator;
    var _oButFullscreen;
    var _fRequestFullScreen = null;
    var _fCancelFullScreen = null;
    
    var _pStartPosShotsIndicator;
    var _pStartPosStageText;
    var _pStartPosFullscreen;
    
    this._init = function(){  
        _bCanPlay = false;
        
        _iCurState = HORIZONTAL_SELECTION_STATE;
        
        _oHud = new CMatchHud(this._onAudioToggle, this);
        _oAudioToggle = _oHud.audioToggle;
        _pStartPosFullscreen = {x: 514, y: 62};
        var oSprite = s_oSpriteLibrary.getSprite('but_fullscreen');
        
        var doc = window.document;
        var docEl = doc.documentElement;
        _fRequestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        _fCancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if(ENABLE_FULLSCREEN === false){
            _fRequestFullScreen = false;
        }
        
        if (_fRequestFullScreen && screenfull.enabled){
            

            _oButFullscreen = new CToggle(_pStartPosFullscreen.x,_pStartPosFullscreen.y,oSprite,s_bFullscreen,s_oStage);
            _oButFullscreen.addEventListener(ON_MOUSE_UP, this._onFullscreenRelease, this);
        }
        
        _oTopBar = new CShotIndicatorController(CANVAS_WIDTH/2, 300, false);
        _oRightBar = new CShotIndicatorController(500, CANVAS_HEIGHT/2 - 20, true);

        if(!s_bMobile){
            document.onkeydown = onKeyDown; 
        }
        
        
        _oShapeKeyListener = new createjs.Shape();
        _oShapeKeyListener.graphics.beginFill("Black").drawRect(0,160,CANVAS_WIDTH,CANVAS_HEIGHT-160);
        _oShapeKeyListener.alpha = 0.01;
        s_oStage.addChild(_oShapeKeyListener);
        _oShapeKeyListener.on("mousedown", this._handleClick, this);

        _pStartPosStageText = {x:16, y:CANVAS_HEIGHT - 24};
        _oStageText = DolphinsTheme.label(TEXT_STAGE + ": 1", 30, "left");
        _oStageBg = DolphinsTheme.plate(148, 44);
        s_oStage.addChild(_oStageBg, _oStageText);

        _pStartPosShotsIndicator = {x: CANVAS_WIDTH - 30, y: CANVAS_HEIGHT - 30};
        _oShotsIndicator = new createjs.Container();
        _oShotsIndicator.x = _pStartPosShotsIndicator.x;
        _oShotsIndicator.y = _pStartPosShotsIndicator.y;
        s_oStage.addChild(_oShotsIndicator);

        var oSprite = s_oSpriteLibrary.getSprite('ball');
        var iFrameWidth = oSprite.width/2;
        var iFrameHeight = oSprite.height/6;
        var oData = {   
                        images: [oSprite],
                        framerate: 30,
                        // width, height & registration point of each sprite
                        frames: {width: iFrameWidth, height: iFrameHeight, regX: iFrameWidth/2, regY: iFrameHeight/2}, 
                        animations: {static:[0]}
                   };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        _aShotIndicator = new Array();
        for(var i=0; i<SHOTS_PER_STAGE; i++){
            _aShotIndicator[i] = createSprite(oSpriteSheet, "static",0,0,0,0);
            _aShotIndicator[i].gotoAndStop("static");
            _aShotIndicator[i].scaleX = _aShotIndicator[i].scaleY = 0.15;
            _aShotIndicator[i].rotation = 30;
            _aShotIndicator[i].x = -i*26;
            _oShotsIndicator.addChild(_aShotIndicator[i]);
        }
        
        
        this.refreshButtonPos(s_iOffsetX,s_iOffsetY);
    };
    
    this.unload = function(){
        _oHud.unload();
        _oAudioToggle = null;
        
        if (_fRequestFullScreen && screenfull.enabled){
            _oButFullscreen.unload();
        }
        
        document.onkeydown = null;
        _oShapeKeyListener.off("mousedown");
        
        s_oInterface = null;
    };
    
    this._handleClick = function(e){
        if(_bCanPlay === true && s_oGame.canAim()){
            switch(_iCurState){
                case HORIZONTAL_SELECTION_STATE:
                    
                    s_oGame.endGoalAnim();
                    
                    _oTopBar.endAnimation();

                    _iCurState++;
                    _oParent.controlState();
                    break;
                case VERTICAL_SELECTION_STATE:
                    
                    _oRightBar.endAnimation();

                    _iCurState++;
                    _oParent.controlState();
                    break;
            }
        }
    };	
    
    function onKeyDown(evt) { 
        if(!evt){ 
            evt = window.event; 
        }  

        if (document.querySelector("dialog[open]")) return;
        switch(evt.keyCode) {  
            //spacebar
            case SPACE_BAR:{
                if (!evt.repeat && !document.querySelector("dialog[open]")) _oParent._handleClick();
                evt.preventDefault();
                return false;
            }
            // left  
            case LEFT: {
                evt.preventDefault();
                return false; 
            }
            //up  
            case UP: {
                evt.preventDefault();
                return false; 
            }         

            // right  
            case RIGHT: {
                evt.preventDefault();
                return false; 
            }
            //down
            case DOWN: {
                evt.preventDefault();
                return false; 
            }     
        }  
    }
    
    this.controlState = function(){
        _bCanPlay = true;
        switch(_iCurState){
            case HORIZONTAL_SELECTION_STATE:{
                    _oTopBar.startAnimation();
                    break;
            }
            case VERTICAL_SELECTION_STATE:{
                    _oRightBar.startAnimation();	
                    break;
            }
            case SHOT_SELECTION_STATE:{
                    _bCanPlay = false;
                    _oTopBar.hide();
                    _oRightBar.hide();
                    s_oGame.playerShot(_oTopBar.getCursorPosition(), _oRightBar.getCursorPosition());
                    break;
            }
        }
    };
    
    this.refreshButtonPos = function(iNewX,iNewY){
        _oHud.setPosition(iNewX, iNewY);
        
        if (_fRequestFullScreen && screenfull.enabled){
            _oButFullscreen.setPosition(_pStartPosFullscreen.x - s_iOffsetX,_pStartPosFullscreen.y + s_iOffsetY);
        }
	
        _oStageText.x = _pStartPosStageText.x + iNewX;
        _oStageText.y = _pStartPosStageText.y - iNewY;
        
        _oStageBg.set({x: -9 + iNewX, y: _oStageText.y - 22});
        _oShotsIndicator.x = _pStartPosShotsIndicator.x - iNewX;
        _oShotsIndicator.y = _pStartPosShotsIndicator.y - iNewY;
    };

    this.refreshScore = function(iValue){
        _oHud.refreshScore(iValue);
    };

    this.refreshConditions = function (distance, wind) {
        _oHud.refreshConditions(distance, wind);
    };

    this.refreshTime = function (ms) {
        _oHud.refreshTime(ms);
    };

    this.refreshStage = function(iStage){
        _oStageText.text = TEXT_STAGE + ": " +iStage;
    };
    
    
    this.refreshShot = function(iValue){
        var iShot = iValue-1;
        _aShotIndicator[SHOTS_PER_STAGE - iShot].visible = false;
    };

    this.resetShotsIndicator = function(){
        for(var i=0; i<SHOTS_PER_STAGE; i++){
            _aShotIndicator[i].visible = true;
        };  
    };

    this.setControlPos = function(iStage){
        _oTopBar.setPos(CANVAS_WIDTH/2 + GOAL_AREA[iStage].x/2, CANVAS_HEIGHT/2 + Math.max(-238, GOAL_AREA[iStage].y/2 + Y_BAR_OFFSET[iStage] - 40), GREEN_INDICATOR_RANGE[iStage]);
        _oRightBar.setPos(CANVAS_WIDTH/2 + GOAL_AREA[iStage].x/2 + 200, CANVAS_HEIGHT/2 + GOAL_AREA[iStage].y/2, GREEN_INDICATOR_RANGE[iStage]);
    };

    this.stopControl = function(){
        _bCanPlay = false;
        
        _oTopBar.hide();
        _oTopBar.endAnimation();
        
        _oRightBar.hide();
        _oRightBar.endAnimation();
    };

    this.resetControl = function(iNewSpeed){
        _bCanPlay = true;
        _iCurState = HORIZONTAL_SELECTION_STATE;
        
        _oTopBar.reset(iNewSpeed);
        _oRightBar.reset(iNewSpeed);
        
        _oTopBar.show();
        _oRightBar.show();
        _oTopBar.startAnimation();
    };
    
    this._onAudioToggle = function(){
        Howler.mute(s_bAudioActive);
        s_bAudioActive = !s_bAudioActive;
        if (!s_bAudioActive) {
            RugbyAnnouncer.stop();
            RugbyCountdown.stop();
        }
    };
    
    this.resetFullscreenBut = function(){
	if (_fRequestFullScreen && screenfull.enabled){
		_oButFullscreen.setActive(s_bFullscreen);
	}
    };


    this._onFullscreenRelease = function(){
        if(s_bFullscreen) { 
		_fCancelFullScreen.call(window.document);
	}else{
		_fRequestFullScreen.call(window.document.documentElement);
	}
	
	sizeHandler();

    };
    
    s_oInterface = this;
    
    this._init();
    
    _oParent = this;
    return this;
}

var s_oInterface = null;
