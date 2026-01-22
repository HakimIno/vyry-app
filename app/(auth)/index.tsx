import { useMemo } from 'react';
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const centerSeed = 'center-main-mm';
  const innerSeeds = useMemo(
    () => ['inner-1', 'inner-2'],
    [],
  );
  const outerSeeds = useMemo(
    () => ['outer-1', 'outer-2', 'outer-3', 'outer-4' , 'outer-5', 'outer-6'],
    [],
  );

  const ringSize = width * 0.78;
  const innerRadius = ringSize * 0.30;
  const outerRadius = ringSize * 0.48;
  const arcYOffset = width * 0.06; // push the drawn rings slightly downward

  const innerAvatars = useMemo(
    () =>
      innerSeeds.map((seed, index) => {
        const angle = (index / innerSeeds.length) * Math.PI * 2 + Math.PI * 0.2;
        return {
          seed,
          angle,
          x: Math.cos(angle) * innerRadius,
          y: Math.sin(angle) * innerRadius,
        };
      }),
    [innerRadius, innerSeeds],
  );

  const outerAvatars = useMemo(
    () =>
      outerSeeds.map((seed, index) => {
        const angle = (index / outerSeeds.length) * Math.PI * 2 + Math.PI * 0.05;
        return {
          seed,
          angle,
          x: Math.cos(angle) * outerRadius,
          y: Math.sin(angle) * outerRadius,
        };
      }),
    [outerRadius, outerSeeds],
  );

  const buildArc = (radius: number, startDeg: number, endDeg: number) => {
    const size = radius * 2;
    const path = Skia.Path.Make();
    path.addArc(
      { x: width / 2 - radius, y: width * 0.26 + arcYOffset, width: size, height: size },
      startDeg,
      endDeg,
    );
    return path;
  };

  return (
    <ImageBackground
      source={require('@/assets/bg.png')}
      resizeMode="cover"
      style={styles.container}
    >
      <View style={[styles.body, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.orbitWrapper}>
          <Canvas style={styles.canvas}>
            <Path
              path={buildArc(innerRadius * 1.5, 0, 360)}
              color="rgba(255, 138, 138, 0.45)"
              strokeWidth={1}
              style="stroke"
              
            />
            <Path
              path={buildArc(outerRadius * 1.5, 0, 360)}
              color="rgba(120, 214, 143, 0.35)"
              strokeWidth={1}
              style="stroke"
              
            />
          </Canvas>

          <View style={styles.centerAvatar}>
            <Image
              source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${centerSeed}` }}
              style={styles.centerImage}
              contentFit="cover"
            />
          </View>

          {innerAvatars.map((item) => (
            <View
              key={item.seed}
              style={[
                styles.avatar,
                styles.innerAvatar,
                {
                  transform: [
                    { translateX: item.x },
                    { translateY: item.y },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.seed}` }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
          ))}

          {outerAvatars.map((item) => (
            <View
              key={item.seed}
              style={[
                styles.avatar,
                styles.outerAvatar,
                {
                  transform: [
                    { translateX: item.x },
                    { translateY: item.y },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.seed}` }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
          ))}
        </View>

        <View style={styles.copy}>
          <ThemedText style={styles.title}>Welcome!</ThemedText>
          <ThemedText style={styles.subtitle}>
            Connect with new friends, chat all day, share photos and videos, and keep every important moment together in one place.
          </ThemedText>
        </View>

        <View style={styles.buttonContainer}>
          <IosButton
            title="Get Started"
            fullWidth
            onPress={() => router.push('/(auth)/phone')}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 12,
  },
  orbitWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  centerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  centerImage: {
    width: '100%',
    height: '100%',
  },
  avatar: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  innerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 28,
  },
  outerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 34,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Roboto_400Regular',
    color: 'white',
    textAlign: 'center',
    lineHeight: 14 * 1.3,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Roboto_400Regular',
    color: 'white',
    textAlign: 'center',
    lineHeight: 12 * 1.3,
  },
  copy: {
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  buttonContainer: {
    marginHorizontal: 12,
  },
});

