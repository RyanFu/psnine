import React, { Component, PropTypes } from 'react';
import {
    StyleSheet,
    Text,
    Image,
    View,
    TouchableHighlight,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    Dimensions,
    InteractionManager,
    ViewPagerAndroid,
    Animated,
    PanResponder,
} from 'react-native';

import { changeSegmentIndex } from '../actions/app';

import { getTopicList } from '../actions/community.js';

import Community from './viewPagers/Community';
import Game from './viewPagers/Game';
import Rank from './viewPagers/Rank';
import Battle from './viewPagers/Battle';
import Gene from './viewPagers/Gene';

let screen = Dimensions.get('window');

let styles = StyleSheet.create({
    container: {

    },
    titleContainer: {
        flexDirection: 'row',
    },
    title: {
        flex: 1,
        backgroundColor: '#00a2ed',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingVertical: 8,
    },
    spacer: {
        flex: 1,
    },
    barContainer: {
        height: 6,
        position: 'relative',
        backgroundColor: '#00a2ed',
    },
    bar: {
        backgroundColor: '#00f',
        position: 'absolute',
        height: 4,
    }
});

let isScrollByClickSegmentedButton = false;

class SegmentedView extends Component {

    static propTypes = {
        duration: PropTypes.number,
        onTransitionStart: PropTypes.func,
        onTransitionEnd: PropTypes.func,
        renderTitle: PropTypes.func,
        titles: PropTypes.array,
        index: PropTypes.number,
        barColor: PropTypes.string,
        barPosition: PropTypes.string,
        underlayColor: PropTypes.string,
        stretch: PropTypes.bool,
        selectedTitleStyle: PropTypes.object,
        titleStyle: PropTypes.object,
        titleWidth: PropTypes.number,
        restWidth: PropTypes.number,
    }; 

    static defaultProps = {
        duration: 200,
        onTransitionStart: ()=>{},
        onTransitionEnd: ()=>{},
        renderTitle: null,
        index: 0,
        barColor: '#44B7E1',
        barPosition:'top',
        underlayColor: '#CCCCCC',
        stretch: false,
        selectedTextStyle: null,
        textStyle: null,
        titleWidth: 72,
        restWidth: 5,
    };  

    constructor(props){
        super(props);

        let { titleWidth, restWidth } = this.props;
        this.state= {
            fadeAnim: new Animated.Value(titleWidth*0 + restWidth),
        };
    }

    componentWillReceiveProps(nextProps) {
        if(this.props.communityType != nextProps.communityType){
            this.props.communityType = nextProps.communityType;
        }else if(this.props.geneType != nextProps.geneType){
            this.props.geneType = nextProps.geneType;
        }
    }

    componentWillMount() {
        let { titleWidth: width, restWidth } = this.props;
        let len = this.props.titles.length;
        this.panResponder = PanResponder.create({  
            onPanResponderTerminationRequest: () => false,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetResponderCapture: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderGrant:(e, gestureState) => {
                this.state.fadeAnim.setOffset(gestureState.x0 - width/2);
                this.state.fadeAnim.setValue(this.state.fadeAnim._startingValue);
            },
            onPanResponderMove: Animated.event([null,{ 
                dx : this.state.fadeAnim,
            }]),
            onPanResponderRelease: (e, gesture) => {
                let { titleWidth: width, restWidth } = this.props;
                let targetX = e.nativeEvent.pageX;
                let segmentedIndex = parseInt(targetX/width);

                let finalTargetX = segmentedIndex*width+restWidth;

                this.state.fadeAnim.setOffset(targetX - width/2 - restWidth );
                this.state.fadeAnim.setValue(this.state.fadeAnim._startingValue);
                this.state.fadeAnim.flattenOffset();

                // Disabled: why this.viewPager.setPage can trigger Animated.spring?
                Animated.spring( 
                    this.state.fadeAnim, 
                    {toValue: finalTargetX,duration: this.props.duration}
                ).start();

                isScrollByClickSegmentedButton = true;

                this.viewPage.setPage(segmentedIndex);
            } 
        });
    }

    _renderTitle(title, i) {
        return (
            <View style={styles.title}>
                <Text style={[this.props.titleStyle, i === this.props.index && this.props.selectedTitleStyle]}>{title}</Text>
            </View>
        );
    }

    renderTitle(title, i) {
        return (
            <View collapsable={false} key={i} ref={i} style={{ flex: this.props.stretch ? 1 : 0 }}>
                <TouchableWithoutFeedback 
                    delayPressIn={0}
                    delayPressOut={0}
                    underlayColor={this.props.underlayColor} 
                    >
                    {this.props.renderTitle ? this.props.renderTitle(title, i) : this._renderTitle(title, i)}
                </TouchableWithoutFeedback>
            </View>
        );
    }

    _onPageSelected = (event) => {
        const { navigator } = this.props;
        isScrollByClickSegmentedButton = false;
        let segmentedIndex = event.nativeEvent.position;
    }

    onPageScroll = ({ nativeEvent }) => {
        const { titleWidth, navigator,restWidth } = this.props;
        
        if(isScrollByClickSegmentedButton == true){
            return;
        }

        let left = titleWidth * (nativeEvent.position + nativeEvent.offset) + restWidth;

        this.state.fadeAnim.setOffset(left);
        this.state.fadeAnim.setValue(0);

    }

    onPageScrollStateChanged = (scrollingState) => {
        if(scrollingState=='dragging'){
            isScrollByClickSegmentedButton = false;
        }else if(scrollingState=='settling'){


        }else if(scrollingState=='idle'){
            isScrollByClickSegmentedButton = false;
            const { titleWidth } = this.props;

            let fadeAnim = this.state.fadeAnim;
            fadeAnim.flattenOffset();
            let currentLeft = fadeAnim._value;
            let segmentedIndex = parseInt(currentLeft/titleWidth);

            let dispatch = this.props.toolbarDispatch;

            dispatch(changeSegmentIndex(segmentedIndex));
            //console.log(this.game.store.getState().app);
        }
    }

    render() {
        console.log('SegmentedView.js rendered');
        let items = [];
        let titles = this.props.titles;

        if (!this.props.stretch) {
            items.push(<View key={`s`} style={styles.spacer} />);
        }

        for (let i = 0; i < titles.length; i++) {
            items.push(this.renderTitle(titles[i], i));
            if (!this.props.stretch) {
                items.push(<View key={`s${i}`} style={styles.spacer} />);
            }
        }

        return (
            <View 
                style={{flex:1}}>
                <View 
                    {...{navigator:this.props.navigator}} 
                    {...this.panResponder.panHandlers} style={[styles.container, this.props.style]}>
                    <View  style={styles.titleContainer}>
                        {items}
                    </View>
                    <View style={styles.barContainer}>
                        <Animated.View  
                            style={[
                                { left: this.state.fadeAnim}, 
                                { width: this.props.titleWidth-this.props.restWidth*2},
                                { height:4,backgroundColor: '#fff',}
                            ]}> 
                        </Animated.View>
                    </View>
                </View>
                <ViewPagerAndroid style={{
                    flex: 10,
                    flexDirection: 'row',
                    backgroundColor: '#F5FCFF',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    paddingVertical: 8,}
                }
                ref={viewPager => {this.viewPage = viewPager;}}
                onPageSelected={this._onPageSelected}
                onPageScrollStateChanged={this.onPageScrollStateChanged}
                onPageScroll={this.onPageScroll}
                >
                    <View key={`s00`}>
                        <Community 
                            index={0} 
                            ref={community=>this.community=community}
                            {...{
                                navigator:this.props.navigator, 
                                communityType: this.props.communityType, 
                              }
                            } 
                        />
                    </View>
                    <View key={`s11`}>
                        <Game 
                            index={1} 
                            ref={game=>this.game=game}
                            {...{navigator:this.props.navigator}} 
                            URL={'http://psnine.com/psngame'}
                        />
                    </View>
                    <View key={`s22`}>
                        <Rank 
                            ref={rank=>this.rank=rank}
                            index={2}
                            {...{navigator:this.props.navigator}} 
                            URL={'http://psnine.com/psnid'}
                        />
                    </View>
                    <View key={`s33`}>
                        <Battle 
                            index={3} 
                            ref={battle=>this.battle=battle}
                            {...{navigator:this.props.navigator}} 
                            URL={'http://psnine.com/battle'}
                        />
                    </View>
                    <View key={`s44`}>
                        <Gene 
                            ref={gene=>this.gene=gene}
                            index={4} 
                            {...{
                                navigator:this.props.navigator, 
                                geneType: this.props.geneType, 
                              }
                            } 
                        />
                    </View>
                </ViewPagerAndroid>
            </View>
        );
    }
}


export default SegmentedView;