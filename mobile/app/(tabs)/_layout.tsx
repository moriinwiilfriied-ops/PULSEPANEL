import React from 'react';
import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { colors } from '@/lib/uiTheme';

/** Nom d’icône Symboles string compatibles SymbolView (SF Symbol names). Une seule chaîne par tab pour éviter typage { ios, android, web }. */
const TAB_SYMBOLS: Record<string, SFSymbol> = {
  feed: 'square.stack.fill' as SFSymbol,
  wallet: 'wallet.pass.fill' as SFSymbol,
  profile: 'person.fill' as SFSymbol,
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <SymbolView name={TAB_SYMBOLS.feed} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Portefeuille',
          tabBarIcon: ({ color }) => (
            <SymbolView name={TAB_SYMBOLS.wallet} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <SymbolView name={TAB_SYMBOLS.profile} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
