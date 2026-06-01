import { Dimensions } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

export const hexToRgba = (hex, opacity) => {
  const normalizedHex = hex.replace(/^#/, '');
  const red = parseInt(normalizedHex.substring(0, 2), 16);
  const green = parseInt(normalizedHex.substring(2, 4), 16);
  const blue = parseInt(normalizedHex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const SW = dimension => wp(`${(dimension / 375) * 100}%`);
export const SH = dimension => hp(`${(dimension / 812) * 100}%`);
export const SF = dimension => hp(`${(dimension / 812) * 100}%`);

export const heightPercent = percent => hp(percent);
export const widthPercent = percent => wp(percent);
export const fontPercent = percent => hp(percent);
