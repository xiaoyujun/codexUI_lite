<template>
  <section class="project-files-root">
    <aside class="project-files-sidebar">
      <div class="project-files-sidebar-header">
        <div class="project-files-heading">
          <span class="project-files-heading-icon" aria-hidden="true">
            <IconTablerFolderOpen />
          </span>
          <div class="project-files-heading-copy">
            <p class="project-files-title">{{ displayName }}</p>
            <p class="project-files-path" :title="currentDirectory">{{ relativeDirectoryLabel }}</p>
          </div>
        </div>
        <div class="project-files-toolbar">
          <button
            class="project-files-icon-button"
            type="button"
            :title="t('Back')"
            :disabled="!canGoUp || isLoadingDirectory"
            @click="goUp"
          >
            <IconTablerChevronLeft />
          </button>
          <button
            class="project-files-icon-button"
            type="button"
            :title="t('Refresh')"
            :disabled="isLoadingDirectory"
            @click="loadDirectory"
          >
            <span class="project-files-refresh-symbol" aria-hidden="true">R</span>
          </button>
        </div>
      </div>

      <div class="project-files-controls">
        <div class="project-files-search-wrap">
          <IconTablerSearch class="project-files-search-icon" />
          <input
            v-model="filterText"
            class="project-files-search"
            type="text"
            :placeholder="t('Filter files...')"
          />
        </div>
        <label class="project-files-toggle">
          <input v-model="showHidden" type="checkbox" @change="loadDirectory" />
          <span>{{ t('Show hidden') }}</span>
        </label>
      </div>

      <p v-if="directoryError" class="project-files-error">{{ directoryError }}</p>
      <p v-else-if="isLoadingDirectory" class="project-files-muted">{{ t('Loading files...') }}</p>
      <p v-else-if="filteredEntries.length === 0" class="project-files-muted">{{ t('No files found') }}</p>

      <ul v-else class="project-files-list">
        <li
          v-for="entry in filteredEntries"
          :key="entry.path"
          class="project-files-row"
          :data-emoji-open="isEmojiPickerOpen('list', entry.path) ? 'true' : 'false'"
        >
          <button
            class="project-files-entry"
            type="button"
            :data-selected="entry.path === activeFilePath ? 'true' : 'false'"
            :title="entry.path"
            @click="onEntryClick(entry)"
          >
            <span class="project-files-entry-icon" aria-hidden="true">
              <IconTablerFolder v-if="entry.isDirectory" />
              <IconTablerPhoto v-else-if="entry.image" />
              <IconTablerFilePencil v-else />
            </span>
            <span class="project-files-entry-copy">
              <span class="project-files-entry-name">{{ entry.name }}</span>
              <span class="project-files-entry-meta">
                {{ entry.isDirectory ? t('Folder') : formatFileSize(entry.size) }}
                <span v-if="entry.markdown">- {{ t('Markdown') }}</span>
                <span v-else-if="entry.image">- {{ t('Image') }}</span>
              </span>
            </span>
          </button>
          <div v-if="canUseTitleEmoji(entry)" class="project-files-emoji-menu-area project-files-entry-tools">
            <button
              class="project-files-emoji-trigger project-files-entry-emoji"
              type="button"
              :title="t('Add emoji')"
              :aria-expanded="isEmojiPickerOpen('list', entry.path)"
              :disabled="emojiRenamePath === entry.path"
              @click.stop="toggleEmojiPicker('list', entry.path)"
            >
              <span aria-hidden="true">{{ leadingTitleEmoji(entry.name) || '🙂' }}</span>
            </button>
            <div
              v-if="isEmojiPickerOpen('list', entry.path)"
              class="project-files-emoji-popover"
              role="menu"
              :aria-label="t('Choose emoji')"
            >
              <button
                v-for="emoji in TITLE_EMOJI_OPTIONS"
                :key="emoji"
                class="project-files-emoji-option"
                type="button"
                role="menuitem"
                :disabled="emojiRenamePath === entry.path"
                @click.stop="renameEntryWithEmoji(entry, emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </aside>

    <main class="project-files-editor">
      <div v-if="!activeFilePath" class="project-files-empty">
        <IconTablerFolderOpen class="project-files-empty-icon" />
        <p class="project-files-empty-title">{{ t('Open a file') }}</p>
        <p class="project-files-empty-copy">{{ t('Markdown files open in preview and can be edited from the same view. Images open in the reader too.') }}</p>
        <div v-if="recentOpenFiles.length > 0" class="project-files-recent">
          <p class="project-files-recent-title">{{ t('Recently opened') }}</p>
          <button
            v-for="recent in recentOpenFiles"
            :key="recent.path"
            class="project-files-recent-entry"
            type="button"
            :title="recent.path"
            @click="onRecentFileClick(recent)"
          >
            <span class="project-files-recent-name">{{ recent.name }}</span>
            <span class="project-files-recent-path">{{ getRelativePath(rootPath, recent.path) || recent.path }}</span>
          </button>
        </div>
      </div>

      <template v-else>
        <header class="project-files-editor-header">
          <div class="project-files-editor-title-wrap">
            <div class="project-files-editor-title-row">
              <div v-if="activeFile?.markdown" class="project-files-emoji-menu-area project-files-title-emoji-wrap">
                <button
                  class="project-files-emoji-trigger project-files-title-emoji"
                  type="button"
                  :title="t('Add emoji')"
                  :aria-expanded="isEmojiPickerOpen('editor', activeFilePath)"
                  :disabled="emojiRenamePath === activeFilePath"
                  @click.stop="toggleEmojiPicker('editor', activeFilePath)"
                >
                  <span aria-hidden="true">{{ activeTitleEmoji || '🙂' }}</span>
                </button>
                <div
                  v-if="isEmojiPickerOpen('editor', activeFilePath)"
                  class="project-files-emoji-popover project-files-title-emoji-popover"
                  role="menu"
                  :aria-label="t('Choose emoji')"
                >
                  <button
                    v-for="emoji in TITLE_EMOJI_OPTIONS"
                    :key="emoji"
                    class="project-files-emoji-option"
                    type="button"
                    role="menuitem"
                    :disabled="emojiRenamePath === activeFilePath"
                    @click.stop="renameActiveMarkdownWithEmoji(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
              <p class="project-files-editor-title" :title="activeFilePath">{{ activeFileName }}</p>
            </div>
            <p class="project-files-editor-subtitle" :title="activeFilePath">{{ activeFileRelativePath }}</p>
          </div>
          <div class="project-files-editor-actions">
            <button
              v-if="activeFile?.markdown"
              class="project-files-action"
              :data-active="viewMode === 'preview' ? 'true' : 'false'"
              type="button"
              @click="viewMode = 'preview'"
            >
              {{ t('Preview') }}
            </button>
            <button
              v-if="activeFile?.markdown"
              class="project-files-action"
              :data-active="viewMode === 'edit' ? 'true' : 'false'"
              type="button"
              @click="viewMode = 'edit'"
            >
              {{ t('Edit') }}
            </button>
            <button
              v-if="activeFile?.editable"
              class="project-files-action"
              type="button"
              :disabled="!canSave"
              @click="saveFile"
            >
              {{ isSaving ? t('Saving...') : t('Save') }}
            </button>
            <a
              class="project-files-action project-files-action-link"
              :href="rawFileHref"
              target="_blank"
              rel="noreferrer"
            >
              {{ t('Raw') }}
            </a>
          </div>
        </header>

        <p v-if="fileError" class="project-files-error project-files-file-error">{{ fileError }}</p>
        <p v-else-if="isLoadingFile" class="project-files-muted project-files-file-loading">{{ t('Opening file...') }}</p>

        <template v-else-if="activeFile">
          <div v-if="activeFile.image" class="project-files-image-stage">
            <img class="project-files-image" :src="imageFileHref" :alt="activeFileName" />
          </div>
          <div v-else-if="activeFile.markdown && viewMode === 'preview'" class="project-files-markdown" v-html="renderedMarkdown" />
          <textarea
            v-else
            v-model="draftContent"
            class="project-files-textarea"
            spellcheck="false"
            @keydown.ctrl.s.prevent="saveFile"
            @keydown.meta.s.prevent="saveFile"
          />
          <footer class="project-files-editor-footer">
            <span>{{ formatFileSize(displayedFileSize) }}</span>
            <span v-if="hasUnsavedChanges">{{ t('Unsaved changes') }}</span>
            <span v-else>{{ footerStatus }}</span>
          </footer>
        </template>
      </template>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  listLocalProjectFiles,
  readLocalProjectTextFile,
  renameLocalProjectEntry,
  saveLocalProjectTextFile,
  type LocalProjectFileEntry,
  type LocalProjectFileListing,
  type LocalProjectTextFile,
} from '../../api/codexGateway'
import { useUiLanguage } from '../../composables/useUiLanguage'
import { getPathLeafName, getPathParent, normalizePathForUi } from '../../pathUtils.js'
import IconTablerChevronLeft from '../icons/IconTablerChevronLeft.vue'
import IconTablerFilePencil from '../icons/IconTablerFilePencil.vue'
import IconTablerFolder from '../icons/IconTablerFolder.vue'
import IconTablerFolderOpen from '../icons/IconTablerFolderOpen.vue'
import IconTablerPhoto from '../icons/IconTablerPhoto.vue'
import IconTablerSearch from '../icons/IconTablerSearch.vue'

const props = defineProps<{
  rootPath: string
  directoryPath: string
  filePath: string
  projectName?: string
  recentFiles?: Array<{
    path: string
    directoryPath: string
    name: string
    openedAt: number
  }>
}>()

const emit = defineEmits<{
  'navigate-directory': [path: string]
  'open-file': [path: string]
  'open-recent-file': [path: string, directoryPath: string]
}>()

const { t } = useUiLanguage()

const listing = ref<LocalProjectFileListing | null>(null)
const activeFile = ref<LocalProjectTextFile | null>(null)
const draftContent = ref('')
const filterText = ref('')
const showHidden = ref(false)
const isLoadingDirectory = ref(false)
const isLoadingFile = ref(false)
const isSaving = ref(false)
const directoryError = ref('')
const fileError = ref('')
const saveStatus = ref('')
const viewMode = ref<'preview' | 'edit'>('preview')
const emojiPickerTarget = ref<{ location: EmojiPickerLocation; path: string } | null>(null)
const emojiRenamePath = ref('')
let directoryRequestId = 0
let fileRequestId = 0

type EmojiPickerLocation = 'list' | 'editor'

const TITLE_EMOJI_OPTIONS = [
  '✨',
  '📌',
  '🧠',
  '🚀',
  '✅',
  '🔥',
  '💡',
  '🧪',
  '🛠️',
  '📁',
  '📄',
  '📝',
  '🎯',
  '⚙️',
  '🔒',
  '⭐',
]

const TITLE_EMOJI_PREFIX_RE =
  /^((?:[\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u20E3)?(?:\u200D[\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u20E3)?)*|[0-9#*]\uFE0F?\u20E3))\s+/u

const rootPath = computed(() => normalizePathForUi(props.rootPath).trim())
const currentDirectory = computed(() => normalizePathForUi(props.directoryPath || props.rootPath).trim())
const activeFilePath = computed(() => normalizePathForUi(props.filePath).trim())
const displayName = computed(() => props.projectName?.trim() || getPathLeafName(rootPath.value) || t('Project files'))
const canGoUp = computed(() => {
  const root = normalizeComparablePath(rootPath.value)
  const current = normalizeComparablePath(currentDirectory.value)
  return root.length > 0 && current.length > 0 && root !== current
})

const relativeDirectoryLabel = computed(() => {
  const relativePath = getRelativePath(rootPath.value, currentDirectory.value)
  return relativePath || t('Project root')
})

const activeFileName = computed(() => getPathLeafName(activeFilePath.value) || t('File'))
const activeTitleEmoji = computed(() => leadingTitleEmoji(activeFileName.value))
const activeFileRelativePath = computed(() => getRelativePath(rootPath.value, activeFilePath.value) || activeFilePath.value)
const rawFileHref = computed(() => `/codex-local-file?path=${encodeURIComponent(activeFilePath.value)}`)
const imageFileHref = computed(() => `/codex-local-image?path=${encodeURIComponent(activeFilePath.value)}`)
const displayedFileSize = computed(() => activeFile.value?.image ? activeFile.value.size : draftContent.value.length)
const hasUnsavedChanges = computed(() => activeFile.value !== null && activeFile.value.editable && draftContent.value !== activeFile.value.content)
const canSave = computed(() => !isSaving.value && activeFile.value !== null && activeFile.value.editable && hasUnsavedChanges.value)
const footerStatus = computed(() => activeFile.value?.image ? t('Image preview') : saveStatus.value || t('Saved'))
const recentOpenFiles = computed(() => {
  const root = rootPath.value
  const active = activeFilePath.value
  return (props.recentFiles ?? [])
    .filter((file) => normalizePathForUi(file.path).trim() && normalizePathForUi(file.path).trim() !== active)
    .slice(0, 4)
    .map((file) => ({
      ...file,
      path: normalizePathForUi(file.path).trim(),
      directoryPath: normalizePathForUi(file.directoryPath).trim() || getPathParent(file.path) || root,
      name: file.name.trim() || getPathLeafName(file.path) || t('File'),
    }))
})

const filteredEntries = computed(() => {
  const entries = listing.value?.entries ?? []
  const query = filterText.value.trim().toLowerCase()
  if (!query) return entries
  return entries.filter((entry) => entry.name.toLowerCase().includes(query))
})

const renderedMarkdown = computed(() => renderMarkdown(draftContent.value, activeFilePath.value))

watch(
  () => [props.rootPath, props.directoryPath, showHidden.value] as const,
  () => {
    void loadDirectory()
  },
  { immediate: true },
)

watch(
  () => props.filePath,
  () => {
    void loadFile()
  },
  { immediate: true },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onProjectFilesWindowPointerDown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', onProjectFilesWindowPointerDown)
  }
})

function onProjectFilesWindowPointerDown(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.project-files-emoji-menu-area')) return
  closeEmojiPicker()
}

async function loadDirectory(): Promise<void> {
  const root = rootPath.value
  const path = currentDirectory.value || root
  if (!root || !path) return
  const requestId = ++directoryRequestId
  isLoadingDirectory.value = true
  directoryError.value = ''
  try {
    const nextListing = await listLocalProjectFiles(root, path, { showHidden: showHidden.value })
    if (requestId !== directoryRequestId) return
    listing.value = nextListing
  } catch (error) {
    if (requestId !== directoryRequestId) return
    directoryError.value = error instanceof Error ? error.message : t('Failed to load project files')
    listing.value = null
  } finally {
    if (requestId === directoryRequestId) isLoadingDirectory.value = false
  }
}

async function loadFile(): Promise<void> {
  const root = rootPath.value
  const path = activeFilePath.value
  const requestId = ++fileRequestId
  fileError.value = ''
  saveStatus.value = ''
  activeFile.value = null
  draftContent.value = ''
  if (!root || !path) {
    isLoadingFile.value = false
    return
  }

  isLoadingFile.value = true
  try {
    const nextFile = await readLocalProjectTextFile(root, path)
    if (requestId !== fileRequestId) return
    activeFile.value = nextFile
    draftContent.value = nextFile.content
    viewMode.value = nextFile.markdown ? 'preview' : 'edit'
  } catch (error) {
    if (requestId !== fileRequestId) return
    fileError.value = error instanceof Error ? error.message : t('Failed to open file')
  } finally {
    if (requestId === fileRequestId) isLoadingFile.value = false
  }
}

async function saveFile(): Promise<void> {
  if (!canSave.value || !activeFile.value) return
  isSaving.value = true
  fileError.value = ''
  saveStatus.value = ''
  try {
    const saved = await saveLocalProjectTextFile(rootPath.value, activeFile.value.path, draftContent.value)
    activeFile.value = {
      ...activeFile.value,
      content: draftContent.value,
      size: saved.size,
      mtimeMs: saved.mtimeMs,
    }
    saveStatus.value = t('Saved')
    void loadDirectory()
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : t('Failed to save file')
  } finally {
    isSaving.value = false
  }
}

function canUseTitleEmoji(entry: LocalProjectFileEntry): boolean {
  return entry.isDirectory || entry.markdown
}

function isEmojiPickerOpen(location: EmojiPickerLocation, path: string): boolean {
  const target = emojiPickerTarget.value
  return target?.location === location && target.path === path
}

function toggleEmojiPicker(location: EmojiPickerLocation, path: string): void {
  if (!path) return
  emojiPickerTarget.value = isEmojiPickerOpen(location, path) ? null : { location, path }
}

function closeEmojiPicker(): void {
  emojiPickerTarget.value = null
}

function leadingTitleEmoji(value: string): string {
  const match = value.trimStart().match(TITLE_EMOJI_PREFIX_RE)
  return match?.[1] ?? ''
}

function removeLeadingTitleEmoji(value: string): string {
  return value.trimStart().replace(TITLE_EMOJI_PREFIX_RE, '')
}

function splitMarkdownExtension(name: string): { title: string; extension: string } {
  const extension = name.match(/(\.md|\.markdown|\.mdx)$/iu)?.[1] ?? ''
  if (!extension) return { title: name, extension: '' }
  return {
    title: name.slice(0, -extension.length),
    extension,
  }
}

function withTitleEmoji(name: string, emoji: string, preserveMarkdownExtension: boolean): string {
  const parts = preserveMarkdownExtension ? splitMarkdownExtension(name) : { title: name, extension: '' }
  const title = removeLeadingTitleEmoji(parts.title).trim()
  return `${emoji} ${title || t('Untitled')}${parts.extension}`
}

async function renamePathWithEmoji(
  path: string,
  currentName: string,
  emoji: string,
  preserveMarkdownExtension: boolean,
  location: EmojiPickerLocation,
): Promise<void> {
  const root = rootPath.value
  const nextName = withTitleEmoji(currentName, emoji, preserveMarkdownExtension)
  if (!root || !path || nextName === currentName) {
    closeEmojiPicker()
    return
  }

  emojiRenamePath.value = path
  directoryError.value = ''
  if (location === 'editor') fileError.value = ''
  try {
    const renamed = await renameLocalProjectEntry(root, path, nextName)
    closeEmojiPicker()
    await loadDirectory()
    if (location === 'editor' || path === activeFilePath.value) {
      emit('open-file', renamed.path)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t('Failed to rename project entry')
    if (location === 'editor') fileError.value = message
    else directoryError.value = message
  } finally {
    if (emojiRenamePath.value === path) emojiRenamePath.value = ''
  }
}

async function renameEntryWithEmoji(entry: LocalProjectFileEntry, emoji: string): Promise<void> {
  await renamePathWithEmoji(entry.path, entry.name, emoji, entry.markdown, 'list')
}

async function renameActiveMarkdownWithEmoji(emoji: string): Promise<void> {
  if (!activeFile.value?.markdown) return
  await renamePathWithEmoji(activeFilePath.value, activeFileName.value, emoji, true, 'editor')
}

function onEntryClick(entry: LocalProjectFileEntry): void {
  if (entry.isDirectory) {
    emit('navigate-directory', entry.path)
    return
  }
  if (entry.editable || entry.image) {
    emit('open-file', entry.path)
    return
  }
  window.open(`/codex-local-file?path=${encodeURIComponent(entry.path)}`, '_blank', 'noopener,noreferrer')
}

function onRecentFileClick(file: { path: string; directoryPath: string }): void {
  emit('open-recent-file', file.path, file.directoryPath || getPathParent(file.path))
}

function goUp(): void {
  if (!listing.value || !canGoUp.value) return
  emit('navigate-directory', listing.value.parentPath)
}

function normalizeComparablePath(value: string): string {
  return normalizePathForUi(value).replace(/[\\/]+$/u, '').toLowerCase()
}

function getRelativePath(root: string, value: string): string {
  const normalizedRoot = normalizePathForUi(root).replace(/[\\/]+$/u, '')
  const normalizedValue = normalizePathForUi(value)
  if (!normalizedRoot || !normalizedValue) return ''
  const comparableRoot = normalizedRoot.toLowerCase()
  const comparableValue = normalizedValue.toLowerCase()
  if (comparableValue === comparableRoot) return ''
  if (!comparableValue.startsWith(`${comparableRoot}/`) && !comparableValue.startsWith(`${comparableRoot}\\`)) {
    return normalizedValue
  }
  return normalizedValue.slice(normalizedRoot.length + 1)
}

function formatFileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

const PREVIEWABLE_IMAGE_EXTENSIONS = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

function stripUrlSuffix(value: string): string {
  const queryIndex = value.indexOf('?')
  const hashIndex = value.indexOf('#')
  const indexes = [queryIndex, hashIndex].filter((index) => index >= 0)
  if (indexes.length === 0) return value
  return value.slice(0, Math.min(...indexes))
}

function isPreviewableImageTarget(value: string): boolean {
  const cleanPath = stripUrlSuffix(value.trim()).toLowerCase()
  const dotIndex = cleanPath.lastIndexOf('.')
  return dotIndex >= 0 && PREVIEWABLE_IMAGE_EXTENSIONS.has(cleanPath.slice(dotIndex))
}

function isLocalAbsolutePath(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value) || value.startsWith('\\\\') || value.startsWith('/')
}

function decodeImageTarget(value: string): string {
  const cleaned = value.trim().replace(/^<(.+)>$/u, '$1').replace(/\s+(['"]).*\1$/u, '')
  try {
    return decodeURIComponent(cleaned)
  } catch {
    return cleaned
  }
}

function joinLocalPath(baseDirectory: string, target: string): string {
  const separator = baseDirectory.includes('\\') ? '\\' : '/'
  let current = normalizePathForUi(baseDirectory).replace(/[\\/]+$/u, '')
  for (const part of target.split(/[\\/]+/u)) {
    if (!part || part === '.') continue
    if (part === '..') {
      current = getPathParent(current) || current
      continue
    }
    current = `${current}${separator}${part}`
  }
  return current
}

function toImageSource(target: string, baseFilePath: string): string {
  const decodedTarget = decodeImageTarget(target)
  if (/^https?:\/\//iu.test(decodedTarget)) return decodedTarget
  if (decodedTarget.startsWith('/codex-local-image?')) return decodedTarget

  const localPath = isLocalAbsolutePath(decodedTarget)
    ? decodedTarget
    : joinLocalPath(getPathParent(baseFilePath), decodedTarget)
  if (!localPath || !isPreviewableImageTarget(localPath)) return ''
  return `/codex-local-image?path=${encodeURIComponent(localPath)}`
}

function normalizeImageDimension(value: string): string {
  const trimmed = value.trim()
  return /^\d{1,5}$/u.test(trimmed) ? trimmed : ''
}

function renderImageHtml(target: string, alt: string, baseFilePath: string, attrs: { width?: string; height?: string } = {}): string {
  const src = toImageSource(target, baseFilePath)
  if (!src) return ''
  const width = attrs.width ? normalizeImageDimension(attrs.width) : ''
  const height = attrs.height ? normalizeImageDimension(attrs.height) : ''
  const widthAttr = width ? ` width="${escapeHtml(width)}"` : ''
  const heightAttr = height ? ` height="${escapeHtml(height)}"` : ''
  return `<img class="project-files-markdown-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr}${heightAttr} loading="lazy" decoding="async">`
}

function renderRawImageTag(line: string, baseFilePath: string): string {
  const trimmed = line.trim()
  if (!/^<img\s/iu.test(trimmed) || !/\/?>$/u.test(trimmed)) return ''
  const src = trimmed.match(/\ssrc=(["'])(.*?)\1/iu)?.[2] ?? ''
  if (!src) return ''
  const alt = trimmed.match(/\salt=(["'])(.*?)\1/iu)?.[2] ?? ''
  const width = trimmed.match(/\swidth=(["'])(.*?)\1/iu)?.[2] ?? ''
  const height = trimmed.match(/\sheight=(["'])(.*?)\1/iu)?.[2] ?? ''
  return renderImageHtml(src, alt, baseFilePath, { width, height })
}

function toSafeMarkdownHref(value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//iu.test(trimmed) || trimmed.startsWith('#') || /^[./]?[^:]+$/u.test(trimmed)) {
    return trimmed
  }
  return ''
}

function renderInlineMarkdown(value: string, baseFilePath: string): string {
  const imageTokens: string[] = []
  function pushImageToken(imageHtml: string): string {
    const token = `\uE000PROJECT_IMAGE_${imageTokens.length}\uE000`
    imageTokens.push(imageHtml)
    return token
  }

  const withLinkedImageTokens = value.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/gu, (full, alt, imageTarget, hrefTarget) => {
    const imageHtml = renderImageHtml(imageTarget, alt, baseFilePath)
    const href = toSafeMarkdownHref(hrefTarget)
    if (!imageHtml || !href) return full
    return pushImageToken(`<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${imageHtml}</a>`)
  })

  const withImageTokens = withLinkedImageTokens.replace(/!\[([^\]]*)\]\(([^)]+)\)/gu, (full, alt, target) => {
    const imageHtml = renderImageHtml(target, alt, baseFilePath)
    if (!imageHtml) return full
    return pushImageToken(imageHtml)
  })

  let html = escapeHtml(withImageTokens)
  html = html.replace(/`([^`]+)`/gu, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/gu, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  imageTokens.forEach((imageHtml, index) => {
    html = html.replace(`\uE000PROJECT_IMAGE_${index}\uE000`, imageHtml)
  })
  return html
}

function renderMarkdown(markdown: string, baseFilePath: string): string {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n')
  const blocks: string[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let inFence = false
  let fenceLanguage = ''
  let codeLines: string[] = []

  function flushParagraph(): void {
    if (paragraph.length === 0) return
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '), baseFilePath)}</p>`)
    paragraph = []
  }

  function flushList(): void {
    if (list.length === 0) return
    blocks.push(`<ul>${list.map((item) => `<li>${renderInlineMarkdown(item, baseFilePath)}</li>`).join('')}</ul>`)
    list = []
  }

  function flushCode(): void {
    const languageLabel = fenceLanguage ? `<span>${escapeHtml(fenceLanguage)}</span>` : ''
    blocks.push(`<pre>${languageLabel}<code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    codeLines = []
    fenceLanguage = ''
  }

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/u)
    if (fence) {
      if (inFence) {
        flushCode()
        inFence = false
      } else {
        flushParagraph()
        flushList()
        inFence = true
        fenceLanguage = fence[1]?.trim() ?? ''
      }
      continue
    }

    if (inFence) {
      codeLines.push(line)
      continue
    }

    if (line.trim().length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    const rawImageHtml = renderRawImageTag(line, baseFilePath)
    if (rawImageHtml) {
      flushParagraph()
      flushList()
      blocks.push(`<p>${rawImageHtml}</p>`)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/u)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2], baseFilePath)}</h${level}>`)
      continue
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/u)
    if (listItem) {
      flushParagraph()
      list.push(listItem[1])
      continue
    }

    if (/^\s*---+\s*$/u.test(line)) {
      flushParagraph()
      flushList()
      blocks.push('<hr>')
      continue
    }

    paragraph.push(line.trim())
  }

  if (inFence) flushCode()
  flushParagraph()
  flushList()
  return blocks.join('\n')
}
</script>

<style scoped>
@reference "tailwindcss";

.project-files-root {
  @apply grid h-full min-h-0 grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] overflow-hidden bg-white text-zinc-950 max-lg:grid-cols-1;
}

.project-files-sidebar {
  @apply flex min-h-0 flex-col border-r border-zinc-200 bg-zinc-50/80 max-lg:h-72 max-lg:border-r-0 max-lg:border-b;
}

.project-files-sidebar-header {
  @apply flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4;
}

.project-files-heading {
  @apply flex min-w-0 items-start gap-3;
}

.project-files-heading-icon {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white;
}

.project-files-heading-icon svg,
.project-files-empty-icon {
  @apply h-5 w-5;
}

.project-files-heading-copy {
  @apply min-w-0;
}

.project-files-title {
  @apply m-0 truncate text-sm font-semibold text-zinc-950;
}

.project-files-path {
  @apply m-0 mt-1 truncate text-xs text-zinc-500;
}

.project-files-toolbar {
  @apply flex shrink-0 items-center gap-1;
}

.project-files-icon-button,
.project-files-action {
  @apply inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-default disabled:opacity-45;
}

.project-files-icon-button {
  @apply w-8 px-0;
}

.project-files-icon-button svg {
  @apply h-4 w-4;
}

.project-files-refresh-symbol {
  @apply text-base leading-none;
}

.project-files-controls {
  @apply flex flex-col gap-2 border-b border-zinc-200 px-4 py-3;
}

.project-files-search-wrap {
  @apply flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3;
}

.project-files-search-icon {
  @apply h-4 w-4 text-zinc-400;
}

.project-files-search {
  @apply min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400;
}

.project-files-toggle {
  @apply inline-flex items-center gap-2 text-xs text-zinc-600;
}

.project-files-toggle input {
  @apply h-4 w-4 rounded border-zinc-300 text-zinc-900;
}

.project-files-error,
.project-files-muted {
  @apply m-0 px-4 py-3 text-sm text-zinc-500;
}

.project-files-error {
  @apply text-zinc-900;
}

.project-files-list {
  @apply m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto px-2 py-2;
}

.project-files-row {
  @apply relative m-0 flex min-w-0 items-center gap-1 p-0;
}

.project-files-entry {
  @apply flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 py-2 text-left transition hover:border-zinc-200 hover:bg-white;
}

.project-files-entry[data-selected='true'] {
  @apply border-zinc-300 bg-white shadow-sm;
}

.project-files-entry-icon {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600;
}

.project-files-entry-icon svg {
  @apply h-4 w-4;
}

.project-files-entry-copy {
  @apply min-w-0 flex-1;
}

.project-files-entry-name {
  @apply block truncate text-sm font-medium text-zinc-900;
}

.project-files-entry-meta {
  @apply mt-0.5 block truncate text-[11px] text-zinc-500;
}

.project-files-entry-tools,
.project-files-title-emoji-wrap {
  @apply relative shrink-0;
}

.project-files-entry-tools {
  @apply opacity-75 transition-opacity;
}

.project-files-row:hover .project-files-entry-tools,
.project-files-row:focus-within .project-files-entry-tools,
.project-files-row[data-emoji-open='true'] .project-files-entry-tools {
  @apply opacity-100;
}

.project-files-emoji-trigger {
  @apply inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-base leading-none text-zinc-700 shadow-sm transition hover:bg-zinc-100 disabled:cursor-default disabled:opacity-45;
}

.project-files-entry-emoji {
  @apply mt-0.5;
}

.project-files-emoji-popover {
  @apply absolute right-0 top-full z-30 mt-1 grid w-56 grid-cols-8 gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl;
}

.project-files-row:nth-last-child(-n + 4) .project-files-emoji-popover {
  @apply bottom-full top-auto mb-1 mt-0;
}

.project-files-emoji-option {
  @apply flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-base leading-none transition hover:bg-zinc-100 disabled:cursor-default disabled:opacity-45;
}

.project-files-editor {
  @apply flex min-h-0 min-w-0 flex-col bg-white;
}

.project-files-empty {
  @apply m-auto flex max-w-sm flex-col items-center px-8 text-center;
}

.project-files-empty-icon {
  @apply mb-3 text-zinc-400;
}

.project-files-empty-title {
  @apply m-0 text-lg font-semibold text-zinc-950;
}

.project-files-empty-copy {
  @apply m-0 mt-2 text-sm leading-6 text-zinc-500;
}

.project-files-recent {
  @apply mt-6 flex w-full flex-col gap-2 border-t border-zinc-200 pt-4 text-left;
}

.project-files-recent-title {
  @apply m-0 text-xs font-semibold uppercase text-zinc-500;
}

.project-files-recent-entry {
  @apply flex w-full min-w-0 flex-col rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition hover:bg-zinc-100;
}

.project-files-recent-name {
  @apply truncate text-sm font-medium text-zinc-900;
}

.project-files-recent-path {
  @apply mt-0.5 truncate text-xs text-zinc-500;
}

.project-files-editor-header {
  @apply flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 max-md:flex-col;
}

.project-files-editor-title-wrap {
  @apply min-w-0;
}

.project-files-editor-title-row {
  @apply flex min-w-0 items-center gap-2;
}

.project-files-title-emoji {
  @apply h-8 w-8;
}

.project-files-title-emoji-popover {
  @apply left-0 right-auto;
}

.project-files-editor-title {
  @apply m-0 truncate text-base font-semibold text-zinc-950;
}

.project-files-editor-subtitle {
  @apply m-0 mt-1 break-all text-xs text-zinc-500;
}

.project-files-editor-actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.project-files-action[data-active='true'] {
  @apply border-zinc-900 bg-zinc-900 text-white hover:bg-black;
}

.project-files-action-link {
  @apply no-underline;
}

.project-files-file-error,
.project-files-file-loading {
  @apply border-b border-zinc-200;
}

.project-files-textarea {
  @apply min-h-0 flex-1 resize-none border-0 bg-white px-5 py-4 font-mono text-[13px] leading-6 text-zinc-900 outline-none;
}

.project-files-markdown {
  @apply min-h-0 flex-1 overflow-auto px-6 py-5 text-sm leading-7 text-zinc-800;
}

.project-files-image-stage {
  @apply flex min-h-0 flex-1 items-center justify-center overflow-auto bg-zinc-50 p-6;
}

.project-files-image {
  @apply max-h-full max-w-full rounded-lg border border-zinc-200 bg-white object-contain shadow-sm;
}

.project-files-markdown :deep(h1),
.project-files-markdown :deep(h2),
.project-files-markdown :deep(h3),
.project-files-markdown :deep(h4),
.project-files-markdown :deep(h5),
.project-files-markdown :deep(h6) {
  @apply mb-3 mt-5 font-semibold leading-tight text-zinc-950;
}

.project-files-markdown :deep(h1) {
  @apply text-2xl;
}

.project-files-markdown :deep(h2) {
  @apply text-xl;
}

.project-files-markdown :deep(h3) {
  @apply text-lg;
}

.project-files-markdown :deep(p) {
  @apply my-3;
}

.project-files-markdown :deep(ul) {
  @apply my-3 list-disc pl-6;
}

.project-files-markdown :deep(li) {
  @apply my-1;
}

.project-files-markdown :deep(code) {
  @apply rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-950;
}

.project-files-markdown :deep(pre) {
  @apply my-4 overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-zinc-100;
}

.project-files-markdown :deep(pre code) {
  @apply bg-transparent p-0 text-zinc-100;
}

.project-files-markdown :deep(pre span) {
  @apply mb-2 block text-[11px] uppercase tracking-wide text-zinc-500;
}

.project-files-markdown :deep(a) {
  @apply text-zinc-950 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900;
}

.project-files-markdown :deep(img) {
  @apply my-4 max-w-full rounded-lg border border-zinc-200 bg-white;
}

.project-files-markdown :deep(hr) {
  @apply my-5 border-0 border-t border-zinc-200;
}

.project-files-editor-footer {
  @apply flex h-9 shrink-0 items-center justify-between border-t border-zinc-200 px-5 text-xs text-zinc-500;
}
</style>

<style>
@reference "tailwindcss";

:root.dark .project-files-root,
:root.dark .project-files-editor,
:root.dark .project-files-textarea {
  @apply bg-zinc-950 text-zinc-100;
}

:root.dark .project-files-sidebar {
  @apply border-zinc-800 bg-zinc-900;
}

:root.dark .project-files-sidebar-header,
:root.dark .project-files-controls,
:root.dark .project-files-editor-header,
:root.dark .project-files-editor-footer,
:root.dark .project-files-recent,
:root.dark .project-files-file-error,
:root.dark .project-files-file-loading {
  @apply border-zinc-800;
}

:root.dark .project-files-title,
:root.dark .project-files-entry-name,
:root.dark .project-files-empty-title,
:root.dark .project-files-recent-name,
:root.dark .project-files-editor-title {
  @apply text-zinc-100;
}

:root.dark .project-files-path,
:root.dark .project-files-entry-meta,
:root.dark .project-files-empty-copy,
:root.dark .project-files-recent-title,
:root.dark .project-files-recent-path,
:root.dark .project-files-editor-subtitle,
:root.dark .project-files-editor-footer,
:root.dark .project-files-muted {
  @apply text-zinc-400;
}

:root.dark .project-files-search-wrap,
:root.dark .project-files-recent-entry,
:root.dark .project-files-icon-button,
:root.dark .project-files-action,
:root.dark .project-files-emoji-trigger,
:root.dark .project-files-emoji-popover {
  @apply border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800;
}

:root.dark .project-files-emoji-option {
  @apply text-zinc-100 hover:bg-zinc-800;
}

:root.dark .project-files-search,
:root.dark .project-files-textarea {
  @apply text-zinc-100 placeholder:text-zinc-500;
}

:root.dark .project-files-entry {
  @apply hover:border-zinc-700 hover:bg-zinc-800;
}

:root.dark .project-files-entry[data-selected='true'] {
  @apply border-zinc-700 bg-zinc-800 shadow-none;
}

:root.dark .project-files-entry-icon {
  @apply bg-zinc-800 text-zinc-300;
}

:root.dark .project-files-action[data-active='true'] {
  @apply border-zinc-100 bg-zinc-100 text-zinc-950 hover:bg-white;
}

:root.dark .project-files-markdown {
  @apply bg-zinc-950 text-zinc-200;
}

:root.dark .project-files-image-stage {
  @apply bg-zinc-950;
}

:root.dark .project-files-image,
:root.dark .project-files-markdown img {
  @apply border-zinc-800 bg-black shadow-none;
}

:root.dark .project-files-markdown h1,
:root.dark .project-files-markdown h2,
:root.dark .project-files-markdown h3,
:root.dark .project-files-markdown h4,
:root.dark .project-files-markdown h5,
:root.dark .project-files-markdown h6 {
  @apply text-zinc-50;
}

:root.dark .project-files-markdown code {
  @apply bg-zinc-800 text-zinc-100;
}

:root.dark .project-files-markdown pre {
  @apply border-zinc-800 bg-black;
}

:root.dark .project-files-markdown a {
  @apply text-zinc-100 decoration-zinc-600 hover:decoration-zinc-100;
}

:root.dark .project-files-markdown hr {
  @apply border-zinc-800;
}
</style>
