import React from 'react'
import {
  BackHandler,
  Dimensions,
  StatusBar,
  View,
  Animated,
  Linking,
  AsyncStorage,
  NetInfo,
  DeviceEventEmitter,
  Platform
} from 'react-native'
import { Provider } from 'react-redux'
import Snackbar from 'react-native-snackbar'
import SplashScreen from 'react-native-splash-screen'
import StackNavigator, { getCurrentRoute, tracker } from './router'
import ColorConfig, {
  getAccentColorFromName
} from './constant/colorConfig'

import configureStore from './redux/store'
import checkVersion from './bootstrap/checkVersion'
import { ColorInfo, ModeInfo } from './interface'

let backPressClickTimeStamp = 0

declare var global

global.toast = () => {}

const netInfoHandler = (reach) => {
  global.netInfo = reach
}

const shouldChangeBackground = Platform.OS !== 'android' || (Platform.OS === 'android' && Platform.Version <= 20)

export default class Root extends React.Component<any, any> {
  store = configureStore()
  constructor(props) {
    super(props)
    const { height, width } = Dimensions.get('window')
    this.state = {
      text: '',
      width,
      height,
      minWidth: Math.min(height, width),
      isNightMode: false,
      tipBarMarginBottom: new Animated.Value(0),
      progress: new Animated.Value(0),
      isLoadingAsyncStorage: true,
      settingInfo: {
        tabMode: 'tab',
        psnid: '',
        userInfo: {
          avatar: require('./../art/avatar.jpg'),
          platinum: '白',
          gold: '金',
          silver: '银',
          bronze: '铜',
          isSigned: true,
          exp: ''
        },
        isNightMode: false,
        colorTheme: 'lightBlue'
      },
      colorTheme: 'lightBlue',
      secondaryColor: 'pink',
      loadingText: 'P9 · 酷玩趣友'
    }
  }

  switchModeOnRoot = (theme) => {
    if (!theme) {
      let targetState = !this.state.isNightMode
      this.setState({
        isNightMode: targetState
      })
      return AsyncStorage.setItem('@Theme:isNightMode', targetState.toString())
    } else {
      const { colorTheme, secondaryColor } = theme
      if (colorTheme) {
        this.setState({
          colorTheme: colorTheme.toString()
        })
        return AsyncStorage.setItem('@Theme:colorTheme', colorTheme.toString())
      } else if (secondaryColor) {
        this.setState({
          secondaryColor: secondaryColor.toString()
        })
        return AsyncStorage.setItem('@Theme:secondaryColor', secondaryColor.toString())
      }
    }
  }

  componentWillMount() {
    global.toast = this.toast
    BackHandler.addEventListener('hardwareBackPress', () => {
      let timestamp: any = new Date()
      if (timestamp - backPressClickTimeStamp > 2000) {
        backPressClickTimeStamp = timestamp
        global.toast && global.toast('再按一次退出程序')
        return true
      } else {
        return false
      }
    })
  }

  reloadSetting = () => {
    const settingInfo: any = {}
    return Promise.all([
      AsyncStorage.getItem('@Theme:tabMode'),
      AsyncStorage.getItem('@psnid'),
      AsyncStorage.getItem('@userInfo'),
      AsyncStorage.getItem('@Theme:isNightMode'),
      AsyncStorage.getItem('@Theme:loadImageWithoutWifi'),
      AsyncStorage.getItem('@Theme:colorTheme'),
      AsyncStorage.getItem('@Theme:shouldSendGA'),
      AsyncStorage.getItem('@Theme:secondaryColor')
    ]).then(result => {
      // console.log('getting psnid: ' + result[1])
      Object.assign(settingInfo, {
        tabMode: result[0] || 'tab',
        psnid: result[1] || '',
        userInfo: JSON.parse(result[2]) || {
          avatar: require('./../art/avatar.jpg'),
          platinum: '白',
          gold: '金',
          silver: '银',
          bronze: '铜',
          isSigned: true,
          exp: ''
        },
        isNightMode: JSON.parse(result[3]) || false,
        colorTheme: result[5] || 'lightBlue',
        secondaryColor: result[7] || 'pink'
      })
      this.setState({
        settingInfo,
        colorTheme: settingInfo.colorTheme,
        isNightMode: settingInfo.isNightMode,
        secondaryColor: settingInfo.secondaryColor
      })
      global.shouldSendGA = JSON.parse(result[6] || 'true')
      global.loadImageWithoutWifi = JSON.parse(result[4]) || false
    }).catch(err => {
      // console.log(err)
      global.toast && global.toast(err.toString())
    })
  }

  loadSetting = () => {
    this.setState({
      isLoadingAsyncStorage: true
    })
    const settingInfo: any = {}
    Promise.all([
      AsyncStorage.getItem('@Theme:tabMode'),
      AsyncStorage.getItem('@psnid'),
      AsyncStorage.getItem('@userInfo'),
      AsyncStorage.getItem('@Theme:isNightMode'),
      AsyncStorage.getItem('@Theme:loadImageWithoutWifi'),
      AsyncStorage.getItem('@Theme:colorTheme'),
      AsyncStorage.getItem('@Theme:shouldSendGA'),
      AsyncStorage.getItem('@Theme:secondaryColor')
    ]).then(result => {
      Object.assign(settingInfo, {
        tabMode: result[0] || this.state.settingInfo.tabMode,
        psnid: result[1] || this.state.settingInfo.psnid,
        userInfo: JSON.parse(result[2]) || this.state.settingInfo.userInfo,
        isNightMode: JSON.parse(result[3]) || this.state.settingInfo.isNightMode,
        colorTheme: result[5] || 'lightBlue',
        secondaryColor: result[7] || 'pink'
      })
      // alert(result[7])
      global.loadImageWithoutWifi = JSON.parse(result[4]) || false
      // console.log('==> GA', JSON.parse(result[6]), JSON.parse(result[6] || 'true'), result[6], typeof result[6])
      global.shouldSendGA = JSON.parse(result[6] || 'true')
      this.setState({
        isLoadingAsyncStorage: false,
        settingInfo,
        colorTheme: settingInfo.colorTheme,
        isNightMode: settingInfo.isNightMode,
        secondaryColor: settingInfo.secondaryColor
      }, () => {
        SplashScreen.hide()
        checkVersion().catch(() => {})
      })
    })
  }

  componentDidMount() {
    this.loadSetting()

    Linking.getInitialURL().then((url) => {
      if (url) {
        // console.log('Initial url is: ' + url);
      }
    }).catch(err => console.error('An error occurred linking', err))
    Linking.addEventListener('url', this._handleOpenURL)

    NetInfo.fetch().then((reach) => {
      global.netInfo = reach
    })
    NetInfo.addEventListener(
      'change',
      netInfoHandler
    )
    this._orientationSubscription = DeviceEventEmitter.addListener('namedOrientationDidChange', this._handleOrientation)
  }
  componentWillUnmount() {
    Linking.removeEventListener('url', this._handleOpenURL)
    NetInfo.removeEventListener('change', netInfoHandler)
    this._orientationSubscription && this._orientationSubscription.remove()
  }
  _handleOpenURL() {
    // console.log(event.url);
  }

  _orientationSubscription: any = false

  _handleOrientation = orientation => {
    let screen: any = {}
    const { height, width } = Dimensions.get('window')
    const min = Math.min(height, width)
    const max = Math.max(height, width)
    const { isLandscape } = orientation
    screen = {
      height: isLandscape ? min : max,
      width: isLandscape ? max : min
    }
    // console.log(orientation, screen)
    this.setState({
      width: screen.width,
      height: screen.height,
      minWidth: min
    })
  }

  toast = (text: any, options?: any) => {
    const action: any = {}
    if (typeof options === 'object') {
      Object.assign(action, options)
    }
    Snackbar.show({
      title: text.toString(),
      duration: Snackbar.LENGTH_SHORT,
      action: Object.keys(action).length ? action : undefined
    })
  }

  render() {
    const dayModeInfo: ColorInfo = ColorConfig[this.state.colorTheme]
    const nightModeInfo: ColorInfo = ColorConfig[this.state.colorTheme + 'Night']
    const targetModeInfo: ColorInfo = this.state.isNightMode ? nightModeInfo : dayModeInfo
    const { isLoadingAsyncStorage } = this.state
    const { colorTheme, secondaryColor, isNightMode, width, height, minWidth } = this.state
    /* get value to avoid remote debugger bug */
    secondaryColor
    isNightMode
    const modeInfo: ModeInfo = Object.assign({}, targetModeInfo, {
      loadSetting: this.loadSetting,
      reloadSetting: this.reloadSetting,
      settingInfo: this.state.settingInfo,
      isNightMode,
      reverseModeInfo: isNightMode ? dayModeInfo : nightModeInfo,
      dayModeInfo: dayModeInfo,
      nightModeInfo: nightModeInfo,
      switchModeOnRoot: this.switchModeOnRoot,
      themeName: isNightMode ? `${colorTheme}Night:${secondaryColor}:${width}` : `${colorTheme}:${secondaryColor}:${width}`,
      colorTheme,
      secondaryColor,
      width,
      height,
      minWidth,
      numColumns: Math.max(1, Math.floor(width / 360)),
      accentColor: getAccentColorFromName(secondaryColor, isNightMode),
      background: (shouldChangeBackground || isNightMode) ? targetModeInfo.brighterLevelOne : targetModeInfo.backgroundColor
    })

    const onNavigationStateChange = global.shouldSendGA ? (prevState, currentState) => {
      const currentScreen = getCurrentRoute(currentState)
      const prevScreen = getCurrentRoute(prevState)
      if (prevScreen && currentScreen && prevScreen.routeName !== currentScreen.routeName) {
        if (global.shouldSendGA) {
          const { routeName = 'Unknow' } = currentScreen
          tracker.trackScreenView(routeName)
        }
      }
    } : undefined

    const child = isLoadingAsyncStorage ? (
      <View style={{ flex: 1 }}/>
    ) : (
        <View style={{ flex: 1 }}>
          <StatusBar translucent={false} hidden={false} backgroundColor={modeInfo.deepColor} barStyle={'light-content'} />
          <StackNavigator
            uriPrefix={'p9://psnine.com/'}
            onNavigationStateChange={onNavigationStateChange} screenProps={{
              modeInfo,
              switchModeOnRoot: this.switchModeOnRoot,
              bottomText: this.state.text
            }} />
        </View>
      )
    return (
      <Provider store={this.store}>
        {child}
      </Provider>
    )
  }
}
