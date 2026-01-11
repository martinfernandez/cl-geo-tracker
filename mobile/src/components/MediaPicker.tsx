import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ActionSheet from './ActionSheet';
import { MediaEditor } from './MediaEditor';

export interface LocalMediaItem {
  uri: string;
  type: 'IMAGE' | 'VIDEO';
  duration?: number; // For videos, in seconds
  thumbnailUri?: string; // For videos, the thumbnail URI
}

interface MediaPickerProps {
  selectedMedia: LocalMediaItem[];
  onMediaChange: (media: LocalMediaItem[]) => void;
  maxItems?: number;
  maxVideoDuration?: number; // In seconds
  disabled?: boolean;
}

export function MediaPicker({
  selectedMedia,
  onMediaChange,
  maxItems = 5,
  maxVideoDuration = 15,
  disabled = false,
}: MediaPickerProps) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const canAddMore = selectedMedia.length < maxItems;

  const showOptions = () => {
    if (!canAddMore) {
      Alert.alert('Limite alcanzado', `Maximo ${maxItems} archivos permitidos`);
      return;
    }
    setShowActionSheet(true);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para usar la camara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newItem: LocalMediaItem = {
        uri: result.assets[0].uri,
        type: 'IMAGE',
      };
      onMediaChange([...selectedMedia, newItem]);
    }
  };

  // Helper function to generate video thumbnail
  const generateVideoThumbnail = async (videoUri: string): Promise<string | undefined> => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0, // Get thumbnail from first frame
        quality: 0.7,
      });
      return uri;
    } catch (error) {
      console.warn('Failed to generate video thumbnail:', error);
      return undefined;
    }
  };

  const handleRecordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para usar la camara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: maxVideoDuration,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const duration = (asset.duration || 0) / 1000; // Convert ms to seconds

      if (duration > maxVideoDuration) {
        Alert.alert(
          'Video muy largo',
          `El video debe durar maximo ${maxVideoDuration} segundos. Duracion actual: ${Math.round(duration)}s`
        );
        return;
      }

      // Generate thumbnail for the video
      const thumbnailUri = await generateVideoThumbnail(asset.uri);

      const newItem: LocalMediaItem = {
        uri: asset.uri,
        type: 'VIDEO',
        duration,
        thumbnailUri,
      };
      onMediaChange([...selectedMedia, newItem]);
    }
  };

  // Pick single image with crop editor
  const handlePickSingleWithCrop = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // 4:3 aspect ratio for better display
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newItem: LocalMediaItem = {
        uri: result.assets[0].uri,
        type: 'IMAGE',
      };
      onMediaChange([...selectedMedia, newItem]);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a la galeria');
      return;
    }

    const remainingSlots = maxItems - selectedMedia.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLoading(true);

      try {
        const newItems: LocalMediaItem[] = [];

        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';

          if (isVideo) {
            const duration = (asset.duration || 0) / 1000;
            if (duration > maxVideoDuration) {
              Alert.alert(
                'Video muy largo',
                `El video "${asset.fileName || 'seleccionado'}" dura ${Math.round(duration)}s. Maximo: ${maxVideoDuration}s`
              );
              continue;
            }

            // Generate thumbnail for the video
            const thumbnailUri = await generateVideoThumbnail(asset.uri);

            newItems.push({
              uri: asset.uri,
              type: 'VIDEO',
              duration,
              thumbnailUri,
            });
          } else {
            newItems.push({
              uri: asset.uri,
              type: 'IMAGE',
            });
          }
        }

        if (newItems.length > 0) {
          onMediaChange([...selectedMedia, ...newItems]);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemove = (index: number) => {
    const newMedia = selectedMedia.filter((_, i) => i !== index);
    onMediaChange(newMedia);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler for MediaEditor's onAddMore
  const handleAddMore = useCallback(() => {
    showOptions();
  }, []);

  return (
    <View style={styles.container}>
      {/* Use MediaEditor when there are selected items (with drag-and-drop support) */}
      {selectedMedia.length > 0 ? (
        <MediaEditor
          media={selectedMedia}
          onMediaChange={onMediaChange}
          onAddMore={handleAddMore}
          maxItems={maxItems}
          disabled={disabled || loading}
        />
      ) : (
        <>
          {/* Empty state with add button */}
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Fotos y videos
            </Text>
            <Text style={[styles.counter, { color: theme.textSecondary }]}>
              {selectedMedia.length}/{maxItems}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.emptyAddButton,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5',
                borderColor: theme.border,
              },
              disabled && styles.addButtonDisabled,
            ]}
            onPress={showOptions}
            disabled={disabled || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary.main} />
            ) : (
              <>
                <Ionicons name="images-outline" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyAddText, { color: theme.textSecondary }]}>
                  Agregar fotos y videos
                </Text>
                <Text style={[styles.helperText, { color: theme.textTertiary, marginTop: 4 }]}>
                  Maximo {maxItems} archivos. Videos hasta {maxVideoDuration} segundos.
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Action Sheet for media options */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Agregar contenido"
        subtitle="Captura el momento para tu reporte"
        options={[
          {
            label: 'Capturar foto',
            icon: 'camera',
            onPress: handleTakePhoto,
          },
          {
            label: 'Grabar video',
            icon: 'videocam',
            onPress: handleRecordVideo,
          },
          {
            label: 'Foto con recorte',
            icon: 'crop',
            onPress: handlePickSingleWithCrop,
          },
          {
            label: 'Elegir multiples',
            icon: 'images',
            onPress: handlePickFromGallery,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  counter: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  mediaItemContainer: {
    position: 'relative',
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addText: {
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyAddButton: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});

export default MediaPicker;
