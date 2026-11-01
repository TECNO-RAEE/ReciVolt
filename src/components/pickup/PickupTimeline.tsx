import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PickupTimelineStep } from '@/models/Pickup';
import { colors, fonts } from '@/theme';

export interface PickupTimelineProps {
  steps: PickupTimelineStep[];
}

export function PickupTimeline({ steps }: Readonly<PickupTimelineProps>) {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Seguimiento del retiro</Text>
      <View style={styles.list}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isUpcoming = step.status === 'upcoming';

          return (
            <View key={step.title} style={styles.stepRow}>
              {/* Indicator column */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent,
                    isUpcoming && styles.circleUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                        isUpcoming && styles.stepNumberUpcoming,
                      ]}
                    >
                      {step.step}
                    </Text>
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted ? styles.connectorCompleted : styles.connectorUpcoming,
                    ]}
                  />
                )}
              </View>

              {/* Text content column */}
              <View style={[styles.contentCol, !isLast && styles.contentColWithLine]}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCurrent && styles.stepTitleCurrent,
                      isUpcoming && styles.stepTitleUpcoming,
                    ]}
                  >
                    {step.title}
                  </Text>
                  {step.dateLabel ? (
                    <Text style={styles.dateLabel}>{step.dateLabel}</Text>
                  ) : null}
                </View>

                {step.subtitle ? (
                  <Text style={styles.subtitle}>{step.subtitle}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  list: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 14,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: colors.primary,
  },
  circleCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySoft,
  },
  circleUpcoming: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  stepNumberCurrent: {
    color: colors.textOnPrimary,
  },
  stepNumberUpcoming: {
    color: colors.textSecondary,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginTop: -2,
    marginBottom: -2,
  },
  connectorCompleted: {
    backgroundColor: colors.primary,
  },
  connectorUpcoming: {
    backgroundColor: colors.border,
  },
  contentCol: {
    flex: 1,
    paddingTop: 3,
  },
  contentColWithLine: {
    paddingBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stepTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  stepTitleCurrent: {
    color: colors.primary,
  },
  stepTitleUpcoming: {
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  dateLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
