<template>
  <div class="journal-list">
    <!-- Left column: entries -->
    <div class="journal-list-list">
      <div
        v-for="(item, index) in list"
        :key="index"
        :class="['list-item', currentJournal.timestamp === item.timestamp ? 'active-item' : '']"
        @click="showJournalDetail(item)"
      >
        <div class="list-item-title">{{ item.title }}</div>
        <div class="list-item-date">{{ item.enDate }}</div>
      </div>
    </div>

    <!-- Right: details & review -->
    <div class="journal-list-content" v-if="currentJournal.content">
      <!-- ===== Top: meta & journal text ===== -->
      <div class="journal-list-content-left">
        <div class="content-title">
          <div class="content-title-text">
            <div class="month">{{ currentJournal.enDate.slice(0, -5) }}</div>
            <div class="week">
              {{ currentJournal.enDate.slice(-4) }}, {{ currentJournal.weekDay }}
            </div>
          </div>

          <div class="content-title-meta">
            <span class="email" :title="currentJournal.userEmail || 'unknown'">
              {{ currentJournal.userEmail || 'unknown' }}
            </span>
          </div>
        </div>

        <div class="content-container">
          <div class="content-container-title">{{ currentJournal.title }}</div>
          <div class="content-container-content">{{ currentJournal.content }}</div>

          <!-- ===== Image review controls ===== -->
          <div class="review-block">
            <div class="review-title">AI Image Review</div>

            <!-- If HAS image: show review UI/status -->
            <template v-if="hasImage">
              <div class="review-actions" v-if="currentJournal.isApproved === false">
                <button @click.stop="approveJournal(currentJournal)">Approve image</button>
                <button class="danger" @click.stop="rejectJournal(currentJournal)">Reject image</button>
              </div>

              <div v-if="currentJournal.isApproved === true" class="status ok">✓ Image is approved</div>
              <div v-else-if="currentJournal.isApproved === 'reject'" class="status reject">✗ Image is rejected</div>
              <div v-else class="status pending">• Pending decision</div>
            </template>

            <!-- If NO image: show placeholder text -->
            <div v-else class="img-empty">No image yet.</div>
          </div>

          <hr class="sep" />

          <!-- ===== Therapy review controls ===== -->
          <div class="review-block">
            <div class="review-title">AI Therapy Review</div>

            <div v-if="currentJournal.therapy" class="therapy-box">
              {{ currentJournal.therapy }}
            </div>
            <div v-else class="therapy-empty">No therapy text yet.</div>

            <div
              class="review-actions"
              v-if="currentJournal.therapy && currentJournal.therapyApproved === false"
            >
              <button @click.stop="approveTherapy(currentJournal)">Approve therapy</button>
              <button class="danger" @click.stop="rejectTherapy(currentJournal)">Reject therapy</button>
            </div>

            <div v-if="currentJournal.therapy && currentJournal.therapyApproved === true" class="status ok">
              ✓ Therapy is approved
            </div>
            <div v-else-if="currentJournal.therapy && currentJournal.therapyApproved === 'reject'" class="status reject">
              ✗ Therapy is rejected
            </div>
            <div v-else-if="currentJournal.therapy && currentJournal.therapyApproved === false" class="status pending">
              • Pending decision
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Right: image preview ===== -->
      <div class="journal-list-content-right">
        <div class="content-img">
          <!-- Only show image when it exists -->
          <template v-if="hasImage">
            <img :src="currentJournal.sdImage" alt="Generated Image" class="ai-img" />
            <div class="img-text">AI–Generated Image</div>
          </template>
          <template v-else>
            <div class="img-empty">No image yet.</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { dayMap, monthMap } from '../lib/util';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'journal-ra',
  props: {
    journalList: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      list: [],
      currentJournal: {
        id: '',
        title: '',
        content: '',
        currentDate: '',
        timestamp: '',
        sdImage: '',
        userEmail: '',
        isApproved: false,        // image review state
        therapy: '',
        therapyApproved: false    // therapy review state
      },
      fallbackCat: ''
    };
  },
  computed: {
    hasImage() {
      return !!(this.currentJournal && this.currentJournal.sdImage);
    }
  },
  watch: {
    journalList() {
      this.filterJournal();
    }
  },
  activated() {
    this.filterJournal();
  },
  methods: {
    // ---------- UI helpers ----------
    showJournalDetail(journal) {
      this.currentJournal = {
        isApproved: false,
        therapyApproved: false,
        ...journal
      };
    },
    filterJournal() {
      this.list = this.journalList.map(item => ({
        isApproved: false,
        therapyApproved: false,
        ...item,
        enDate: this.formatEnDate(item.currentDate),
        weekDay: this.getWeekDay(item.currentDate)
      }));
      // keep selection consistent
      if (this.currentJournal?.id) {
        const found = this.list.find(x => x.id === this.currentJournal.id);
        if (found) this.showJournalDetail(found);
      }
    },
    getWeekDay(ymd) {
      const [y, m, d] = String(ymd).split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dayMap[dt.getDay()];
    },
    formatEnDate(ymd) {
      const [y, m, d] = String(ymd).split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const mon = monthMap[dt.getMonth()].slice(0, 3);
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${mon}.${dd}.${y}`;
    },

    // ---------- IMAGE review ----------
    async approveJournal(journal) {
      try {
        const ref = doc(db, 'journalList', journal.id);
        await updateDoc(ref, { isApproved: true });
        this.patchRow(journal.id, { isApproved: true });
        this.$message?.success('Image approved');
      } catch (err) {
        console.error(err);
        this.$message?.error('Approve failed: ' + err.message);
      }
    },
    async rejectJournal(journal) {
      try {
        const ref = doc(db, 'journalList', journal.id);
        await updateDoc(ref, { isApproved: 'reject' });
        this.patchRow(journal.id, { isApproved: 'reject' });
        this.$message?.success('Image rejected');
      } catch (err) {
        console.error(err);
        this.$message?.error('Reject failed: ' + err.message);
      }
    },

    // ---------- THERAPY review ----------
    async approveTherapy(journal) {
      try {
        const ref = doc(db, 'journalList', journal.id);
        await updateDoc(ref, { therapyApproved: true });
        this.patchRow(journal.id, { therapyApproved: true });
        this.$message?.success('Therapy approved');
      } catch (err) {
        console.error(err);
        this.$message?.error('Approve failed: ' + err.message);
      }
    },
    async rejectTherapy(journal) {
      try {
        const ref = doc(db, 'journalList', journal.id);
        await updateDoc(ref, { therapyApproved: 'reject' });
        this.patchRow(journal.id, { therapyApproved: 'reject' });
        this.$message?.success('Therapy rejected');
      } catch (err) {
        console.error(err);
        this.$message?.error('Reject failed: ' + err.message);
      }
    },

    // keep list + current in sync after any update
    patchRow(id, patch) {
      this.list = this.list.map(it => (it.id === id ? { ...it, ...patch } : it));
      if (this.currentJournal.id === id) {
        this.currentJournal = { ...this.currentJournal, ...patch };
      }
    }
  },
  mounted() {
    this.filterJournal();
    this.fallbackCat = new URL('../assets/image/cat.jpeg', import.meta.url).href;
  }
};
</script>

<style lang="less" scoped>
.journal-list {
  height: 100%;
  overflow: hidden;
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  box-sizing: border-box;

  &-list {
    height: 100%;
    overflow: auto;
    width: 20%;
    background: rgb(244, 248, 255);

    .active-item { background: rgb(230, 235, 248); }

    .list-item {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      font-weight: bold;
      cursor: pointer;

      &-title {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
      }
      &-date { margin-top: 10px; }

      &:last-of-type { border-bottom: none; }
      &:hover { background: rgb(230, 235, 248); }
    }
  }

  &-content {
    height: 100%;
    width: 80%;
    flex: auto;
    display: flex;

    &-left {
      width: 50%;
      height: 100%;
      overflow: auto;
      padding: 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;

      .content-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        padding: 10px;

        &-text .month { font-size: 24px; font-weight: bold; }
        &-text .week { margin-top: 4px; }

        &-meta .email {
          max-width: 260px;
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #334155;
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .content-container {
        padding: 20px;
        flex: auto;
        overflow: auto;

        &-title { font-size: 24px; font-weight: bold; }
        &-content { line-height: 20px; margin-top: 16px; }
      }

      .review-block { margin-top: 16px; }
      .review-title { font-weight: 700; margin-bottom: 8px; }

      .review-actions {
        margin: 8px 0;
        button {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          background: #2d7dfe;
          color: #fff;
          cursor: pointer;
        }
        .danger { background: #dc3545; margin-left: 8px; }
      }

      .status { font-weight: 600; margin-top: 6px; }
      .ok { color: #118a00; }
      .reject { color: #b30000; }
      .pending { color: #777; }

      .sep { border: none; border-top: 1px solid #eee; margin: 16px 0; }

      .therapy-box {
        white-space: pre-wrap;
        line-height: 1.5;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 10px;
        background: #fafafa;
        max-height: 180px;
        overflow: auto;
      }
      .therapy-empty { color: #888; font-style: italic; }
      .img-empty { color: #888; font-style: italic; }
    }

    &-right {
      width: 50%;
      height: 100%;
      overflow: auto;
      padding: 20px;
      box-sizing: border-box;
      border-left: 1px solid rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;

      .content-img {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        flex: auto;
        width: 100%;

        .ai-img { width: 100%; height: auto; }
        .img-text { margin-top: 12px; color: #555; }
      }
    }
  }
}
</style>
