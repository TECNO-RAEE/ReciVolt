const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# --- recivolt keep rules ---';
const RULES = `
${MARKER}
# WorkManager (via androidx.startup) instantiates Room's generated WorkDatabase_Impl by reflection
-keep class * extends androidx.room.RoomDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
# expo-camera enables the QR scanner only if Class.forName finds this class by its original name
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-keep class * implements com.google.firebase.components.ComponentRegistrar { *; }
`;

// Release builds minify with R8; these classes are loaded by name and must keep it.
module.exports = function withProguardKeepRules(config) {
  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const file = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes(MARKER)) fs.writeFileSync(file, current + RULES);
      return modConfig;
    },
  ]);
};
