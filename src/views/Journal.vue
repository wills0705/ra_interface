<template>
  <div class="journal-list">
    <div class="journal-list-list">
      <div
        :class="['list-item', currentJournal.timestamp === item.timestamp ? 'active-item' : '']"
        v-for="(item, index) in list"
        :key="index"
        @click="showJournalDetail(item)"
      >
        <div class="list-item-title">
          {{ item.title }}
        </div>
        <div class="list-item-date">
          {{ item.enDate }}
        </div>
      </div>
    </div>

    <div class="journal-list-content" v-if="currentJournal.content">
      <!-- Left Panel: Journal Info -->
      <div class="journal-list-content-left">
        <div class="content-title">
          <div class="content-title-text">
            <div class="month">{{ currentJournal.enDate.slice(0, -5) }}</div>
            <div class="week">{{ currentJournal.enDate.slice(-4) }}, {{ currentJournal.weekDay }}</div>
          </div>
        </div>

        <div class="content-container">
          <div class="content-container-title">
            {{ currentJournal.title }}
          </div>
          <div class="content-container-content">
            {{ currentJournal.content }}
          </div>
          
          <!-- Approve button -->
          <button
            v-if="currentJournal.isApproved === false"
            @click.stop="approveJournal(currentJournal)"
          >
            Approve
          </button>
          <!-- If it is already approved, show some indicator -->
          <div v-if="currentJournal.isApproved === true">
            <strong>Image is approved!</strong>
          </div>


          <!-- Reject button -->
          <button
            v-if="currentJournal.isApproved === false"
            @click.stop="rejectJournal(currentJournal)"
          >
            Reject
          </button>
          <!-- If it is already rejected, show some indicator -->
          <div v-if="currentJournal.isApproved !== false && currentJournal.isApproved !== true">
            <strong>Image is rejected!</strong>
          </div>

        </div>
      </div>

      <!-- Right Panel: AI Image (base64) or fallback cat -->
      <div class="journal-list-content-right">
        <div class="content-img">
          <img
            :src="currentJournal.sdImage || fallbackCat"
            alt="Generated Image"
            class="ai-img"
          />
          <div class="img-text">
            AI-Generated Image
          </div>
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
  name: 'journal',
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
        sdImage: ''
      },
      fallbackCat: ''
    };
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
    showJournalDetail(journal) {
      this.currentJournal = {
        ...journal
      };
    },
    filterJournal() {
      this.list = this.journalList.map(item => {
        return {
          ...item,
          enDate: this.formatEnDate(item.currentDate),
          weekDay: this.getWeekDay(item.currentDate)
        };
      });
    },
    getWeekDay(ymd) {
      // ymd: "YYYY-MM-DD" → parse as local date
      const [y, m, d] = String(ymd).split('-').map(Number);
      const dt = new Date(y, m - 1, d); // local
      return dayMap[dt.getDay()];
    },
    formatEnDate(ymd) {
      const [y, m, d] = String(ymd).split('-').map(Number);
      const dt = new Date(y, m - 1, d); // local
      const mon = monthMap[dt.getMonth()].slice(0, 3);
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${mon}.${dd}.${y}`;
    },
    async approveJournal(journal) {
      try {        
        const docRef = doc(db, 'journalList', journal.id);        
        await updateDoc(docRef, { isApproved: true });        
        const updatedJournal = { ...journal, isApproved: true };        
        this.list = this.list.map(item =>
          item.id === journal.id 
            ? { ...item, isApproved: true } 
            : item
        )
        if (this.currentJournal.id === journal.id) {
          this.currentJournal.isApproved = true
        }        
        if (this.currentJournal.id === journal.id) {
          this.currentJournal = { ...updatedJournal };
        }
        
        this.$message.success('Journal is approved');
      } catch (err) {
        console.error('whole error message:', err);
        console.error('error stack:', err.stack);
        this.$message.error('approve failed: ' + err.message);
      } 
    },
    async rejectJournal(journal) {
      try {        
        const docRef = doc(db, 'journalList', journal.id);        
        await updateDoc(docRef, { isApproved: "reject" });        
        const updatedJournal = { ...journal, isApproved: "reject" };        
        this.list = this.list.map(item =>
          item.id === journal.id 
            ? { ...item, isApproved: "reject" } 
            : item
        )
        if (this.currentJournal.id === journal.id) {
          this.currentJournal.isApproved = "reject"
        }        
        if (this.currentJournal.id === journal.id) {
          this.currentJournal = { ...updatedJournal };
        }
        
        this.$message.success('Journal is rejected');
      } catch (err) {
        console.error('whole error message:', err);
        console.error('error stack:', err.stack);
        this.$message.error('reject failed: ' + err.message);
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

    .active-item {
      background: rgb(230, 235, 248);
    }

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

      &-date {
        margin-top: 10px;
      }

      &:last-of-type {
        border-bottom: none;
      }

      &:hover {
        background: rgb(230, 235, 248);
      }
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

        &-text {
          .month {
            font-size: 24px;
            font-weight: bold;
          }

          .week {
            margin-top: 4px;
          }
        }
      }

      .content-container {
        padding: 20px;
        flex: auto;
        overflow: auto;

        &-title {
          font-size: 24px;
          font-weight: bold;
        }

        &-content {
          line-height: 20px;
          margin-top: 24px;
        }
      }

      .content-text {
        padding: 20px;
        font-size: 16px;
        font-weight: bold;
      }
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

        .ai-img {
          width: 100%;
          height: auto;
        }

        .img-text {
          margin-top: 20px;
        }
      }
    }
  }
}
</style>