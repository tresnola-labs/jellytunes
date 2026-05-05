/**
 * Tests for path validation in sync-files (issue ORAIN-0227)
 *
 * Verifies that tagFile rejects paths with FFmpeg protocols or path traversal
 * as defense-in-depth validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { createFFmpegConverter } from './sync-files';

// Mock the ffmpeg-path module to avoid actual FFmpeg dependency in tests
vi.mock('./ffmpeg-path', () => ({
  resolveFFmpegPath: () => '/usr/local/bin/ffmpeg',
}));

describe('assertFilesystemPath (via tagFile)', () => {
  // We test the validation indirectly through tagFile since assertFilesystemPath
  // is a private function. tagFile is the public interface that uses it.

  const converter = createFFmpegConverter();

  // Minimal valid metadata
  const validMeta = {
    title: 'Test',
    artist: 'Artist',
    album: 'Album',
    year: '2024',
    trackNumber: '1',
    discNumber: '1',
  };

  describe('rejects FFmpeg protocol paths', () => {
    it('rejects pipe input protocol', async () => {
      await expect(converter.tagFile('pipe:0', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/FFmpeg protocol URIs are not allowed/);
    });

    it('rejects file protocol with double slash', async () => {
      await expect(converter.tagFile('file:///tmp/input.mp3', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/FFmpeg protocol URIs are not allowed/);
    });

    it('rejects data: protocol', async () => {
      await expect(converter.tagFile('data:image/png;base64,xxxx', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/FFmpeg protocol URIs are not allowed/);
    });

    it('rejects http:// protocol', async () => {
      await expect(converter.tagFile('http://evil.com/input.mp3', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/FFmpeg protocol URIs are not allowed/);
    });

    it('rejects output path with protocol too', async () => {
      await expect(converter.tagFile('/tmp/input.mp3', 'pipe:1', validMeta))
        .rejects.toThrow(/FFmpeg protocol URIs are not allowed/);
    });
  });

  describe('rejects path traversal', () => {
    it('rejects input path with ../ traversal', async () => {
      await expect(converter.tagFile('/tmp/../../../etc/passwd', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/local filesystem path/);
    });

    it('rejects output path with ../ traversal', async () => {
      await expect(converter.tagFile('/tmp/input.mp3', '/tmp/../../../etc/passwd', validMeta))
        .rejects.toThrow(/local filesystem path/);
    });

    it('rejects input path with .. in middle of path', async () => {
      await expect(converter.tagFile('/tmp/../home/user/file.mp3', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/local filesystem path/);
    });

    it('rejects empty string input path', async () => {
      await expect(converter.tagFile('', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/non-empty string/);
    });
  });

  describe('rejects non-absolute paths', () => {
    it('rejects relative input path', async () => {
      await expect(converter.tagFile('relative/path.mp3', '/tmp/output.mp3', validMeta))
        .rejects.toThrow(/must be absolute/);
    });
  });
});