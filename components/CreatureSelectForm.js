import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import React, { Fragment, useState, useEffect, useRef } from 'react'
import { useRecoilState } from 'recoil'
import { activeCreaturesState } from '../atoms/activeCreaturesAtom'
import chroma from "chroma-js"
import { loadingState } from '../atoms/loadingAtom'

export default function CreatureSelectForm({ creatures, tab }) {
  const [selectedCreature, setSelectedCreature] = useState('')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('');
  const [hp, setHp] = useState('');
  const [ac, setAc] = useState('');
  const [init, setInit] = useState('');
  const [bonus, setBonus] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoading, setIsLoading] = useRecoilState(loadingState)
  const [activeCreatures, setActiveCreatures] = useRecoilState(activeCreaturesState);
  const [colors, setColors] = useState([])
  const [customTypeIsNPC, setCustomTypeIsNPC] = useState(false) 
  const d20Ref = useRef(null);

  useEffect(() => {
    const randColorsArray = [];
    for (let i = 0; i < 100; i++)
    {
      let randColor = chroma.random();
      while(chroma.contrast(randColor, '#212936') < 4.5)
      {
        randColor = chroma.random()
      }
      randColorsArray.push(randColor)
    }
    
    setColors(randColorsArray)
  }, [])

  const filteredCreatures =
  query === ''
    ? creatures
    : creatures.filter((creature) =>
        creature.name
          .toLowerCase()
          .replace(/\s+/g, '')
          .match(`^${query.toLowerCase().replace(/\s+/g, '')}`)
      )
    
  const spinDice = (e) => {
    e.preventDefault()

    if (isSpinning)
    {
      return
    }

    setIsSpinning(true)
    d20Ref.current.classList.add('animate-spin-fast')

    setTimeout(() => {
      d20Ref.current.classList.remove('animate-spin-fast')
      setIsSpinning(false)
    }, 600)
    setInit(Math.floor(Math.random() * 20) + 1 + parseInt(bonus))
  }

  const updateList = (data) => {
    let newArray = [ ...activeCreatures, data ]
    let flag = false

    outerloop:
    for (let i = 0; i < newArray.length; i++)
    {
      for (let j = i; j < newArray.length; j++)
      {
        if (newArray[i].name == data.name && newArray[i].id != data.id)
        {
          flag = true
          break outerloop
        }
      }
    }

    if (flag)
    {
      for (let i = 0; i < newArray.length; i++)
      {
        if (!newArray[i].color && newArray[i].name == data.name)
        {
          const usedColors = newArray.map((elt) => {
            if (elt.color != null && elt.name == data.name)
              return elt.color
            else
              return
          })
          
          const availableColors = colors.filter((color) => !usedColors.includes(color))
          const newItem = {
            ...newArray[i]
          }
          newItem.color = availableColors[Math.floor(Math.random() * availableColors.length)].hex()
          newArray[i] = newItem
        }
      }
    }

    newArray.sort((a, b) => {
      if (a.initiative != b.initiative) {
        return parseInt(b.initiative) - parseInt(a.initiative)
      }
      else {
        return parseInt(b.dex_bonus) - parseInt(a.dex_bonus)
      }
    })
    // console.log(newArray)
    setActiveCreatures(newArray)
  }

  const addCreatureToList = (e) => {
    e.preventDefault()
    if (!selectedCreature)
      return
    
    if (isLoading) {
      return
    }

    const selectedCreatureData = {
      ...selectedCreature,
      id: Math.random(),
      max_hp: parseInt(hp),
      initiative: parseInt(init),
      dex_bonus: parseInt(bonus),
      ac: parseInt(ac),
      pc: false,  // Player Character
      npc: false,
      color: null,
      tmpHp: 0,
      hp: parseInt(hp),
      activeStatuses: [],
      overflowStatuses: [],
    }
    updateList(selectedCreatureData)
  }

  const addPlayerToList = (e) => {
    e.preventDefault()
    if (!name)
      return
    const playerData = {
      id: Math.random(),
      name: name,
      initiative: parseInt(init),
      dex_bonus: parseInt(bonus),
      pc: true,
      npc: false,
      tmpHp: 0,
      hp: parseInt(hp),
      activeStatuses: [],
      overflowStatuses: [],
    }
    updateList(playerData)
  }

  const addCustomToList = (e) => {
    e.preventDefault()
    if (!name)
      return
    const customData = {
      id: Math.random(),
      name: name,
      max_hp: parseInt(hp),
      initiative: parseInt(init),
      dex_bonus: parseInt(bonus),
      ac: parseInt(ac),
      pc: false,  // Player Character
      npc: customTypeIsNPC ? true : false,
      color: null,
      tmpHp: 0,
      hp: parseInt(hp),
      activeStatuses: [],
      overflowStatuses: [],
    }
    updateList(customData)
  }

  const handleChangeInput = (e, input, setInput, maxDigits) => {
    if (e.target.value.length > maxDigits) {
      setInput(Math.floor(parseInt(e.target.value) / 10));
    } else if (!e.target.value) {
      setInput(e.nativeEvent.data);
    } else if (e.target.value[0] == 0) {
      if (e.nativeEvent.data == "-") {
        setInput(e.nativeEvent.data);
      } else {
        setInput(e.target.value.slice(-1));
      }
    } else {
      setInput(e.target.value);
    }
  };

  const clearZero = (e, input, setInput) => {
    if (input == '0')
      setInput('')
  }

  const handleCustomTypeChange = (e) => {
    if (e.target.value == 'creature')
      setCustomTypeIsNPC(false)
    else
      setCustomTypeIsNPC(true)
  }

  useEffect(() => {
    if (!selectedCreature)
      return;

    setIsLoading(true)
    
    const fetchData = async () => {
      const res = await fetch(`https://www.dnd5eapi.co` + selectedCreature.url);
      const json = await res.json()
      console.log("JSON: ", json);
      setBonus(Math.floor((parseInt(json.dexterity) - 10) / 2))
      setHp(json.hit_points)
      setAc(json.armor_class[0].value)
      setInit(0)
      setIsLoading(false)
    }

    try {
      fetchData()
    } catch (error) {
      setIsLoading(false)
      console.log(error)
    }
    
  }, [selectedCreature, setIsLoading])

  useEffect(() => {
    setSelectedCreature('')
    setQuery('')
    setName('')
    setHp(0)
    setAc(0)
    setInit(0)
    setBonus(0)
  }, [tab])

  return (
    <form 
      className={`m-4 text-gray-800 grid grid-cols-[1fr_1fr_150px] gap-2 transition-all 
      duration-150 ease-in-out overflow-hidden relative
      ${tab === 'player' ? 'xs:h-[160px]' : 'xs:h-[248px]'}`}
      onSubmit={tab == 'player' ? addPlayerToList : tab == 'creatures' ? addCreatureToList : addCustomToList}
    >
      <div className='col-span-3 xs:col-span-2 justify-self-center w-full relative'>
        {
          tab === 'player' || tab === 'custom' ?
            (
              <div>
                <input
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${tab === 'player' ? 'Character name' : 'Creature / NPC name'}`}
                  className='w-full border-0 rounded-lg py-2 pl-3 pr-10 leading-5 text-gray-800 
                  shadow-md focus:ring-0 focus:shadow-lg bg-gray-100
                  duration-300 transition-shadow'
                />

                {/* Creature / NPC type picker for custom tab only */}
                {
                  tab == 'custom' && 
                  <div className='flex flex-col mx-2 mt-2 space-y-2'>
                    <input 
                      type='radio' 
                      name='customType'
                      id='customTypeCreatureRadioBtn'
                      value='creature'
                      checked={!customTypeIsNPC}
                      onChange={(e) => handleCustomTypeChange(e)}
                      className='hidden'
                    />
                    <label
                      for='customTypeCreatureRadioBtn'
                      className={'flex text-gray-200 items-center cursor-pointer text-md'}
                    >
                      <span 
                        className={`w-6 h-6 inline-block rounded-full border border-black-200 mr-2 
                        ${!customTypeIsNPC && 'bg-red-800'}`}
                      />
                      Creature
                    </label>
                    <input 
                      type='radio' 
                      name='customType'
                      id='customTypeNPCRadioBtn'
                      value='npc'
                      checked={customTypeIsNPC}
                      onChange={(e) => handleCustomTypeChange(e)}
                      className='hidden'
                    />
                    <label
                      for='customTypeNPCRadioBtn'
                      className='flex text-gray-200 items-center cursor-pointer text-md'
                    >
                      <span 
                        className={`w-6 h-6 inline-block rounded-full border border-gray-200 mr-2 
                        ${customTypeIsNPC && 'bg-red-800'}`}
                      />
                      NPC
                    </label>
                  </div>
                }
              </div>
            )
          : tab === 'creatures' ?
          (
            <Combobox value={selectedCreature} onChange={setSelectedCreature}>
              <div className="relative">
                <div className="relative w-full cursor-default rounded-lg bg-white text-left">
                  <Combobox.Input
                    className="w-full border-0 rounded-lg py-2 pl-3 pr-10 leading-5 text-gray-800 
                    shadow-md focus:ring-0 focus:shadow-lg bg-gray-100
                    duration-300 transition-shadow"
                    displayValue={(person) => person.name}
                    onChange={(event) => setQuery(event.target.value)}
                    spellCheck='false'
                    placeholder='Search for a creature...'
                    // autoFocus={true}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-600"
                      aria-hidden="true"
                    />
                  </Combobox.Button>
                </div>
                <Transition
                  as={Fragment}
                  enterFrom='opacity-0'
                  enter='transition ease-in duration-100'
                  enterTo='opacity-100'
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setQuery('')}
                >
                  <Combobox.Options 
                    className="absolute mt-1 max-h-44 w-full overflow-auto rounded-md bg-gray-50 py-1 
                    shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none scrollbar-thin 
                    scrollbar-thumb-gray-400 scrollbar-thumb-rounded-md z-10"
                  >
                    {filteredCreatures.length === 0 && query !== '' ? (
                      <div className="relative cursor-default select-none py-0.5 px-3 text-gray-700">
                        Nothing found.
                      </div>
                    ) : (
                      filteredCreatures.map((creature) => (
                        <Combobox.Option
                          key={creature.index}
                          className={({ active }) =>
                            `relative cursor-default select-none py-0.5 px-3 ${
                              active ? 'bg-gray-600 text-gray-100' : 'text-gray-700'
                            }`
                          }
                          value={creature}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? 'font-bold' : 'font-normal'
                                }`}
                              >
                                {creature.name}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 right-4 flex items-center pl-3 ${
                                    active ? 'text-gray-100' : 'text-gray-700'
                                  }`}
                                >
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          )
          : null
        }
        
        {/* Background image */}
        {tab != 'player' &&
          <Image
            priority
            src='/dragon-red.png' width={195} height={200} alt='dragon'
            className='absolute bottom-[15px] left-1/2 -translate-x-1/2 z-0 opacity-60 hidden xs:block'
          />
        }
        {tab == 'player' &&
          <div className='absolute bottom-[15px] left-1/2 -translate-x-1/2 z-0 opacity-100 hidden xs:block'>
            <Image 
              priority
              src='/helmet.png' width={140} height={140} alt='barbarian helmet'
            />
          </div>
        }
      </div>

      <div className='grid grid-cols-[1fr, 1fr] gap-2 items-center col-span-3 xs:col-span-1 w-36 justify-self-end sm:justify-self-center'>
        {
          tab != 'player' &&
          (
            <>
              <div className='text-gray-100 px-2 rounded-md w-full text-center text-xs col-start-1 col-end-2'>HP</div>
              <div className='text-gray-100 px-2 rounded-md w-full text-center text-xs col-start-1 col-end-2'>AC</div>
            </>
          )
        }

        <div className='text-gray-100 px-2 rounded-md w-full text-center text-xs col-start-1 col-end-2'>
          Initiative
          <span className='block'>(total) </span>
        </div>
        <div className='text-gray-100 px-2 rounded-md w-full text-center text-xs col-start-1 col-end-2'>
          Bonus
          <span className='block'>(optional) </span>
        </div>
        {
          tab != 'player' && (
            <div 
              className='text-gray-800 p-0.5 rounded-md text-center text-xs flex justify-center 
              items-center col-start-1 col-end-2 cursor-pointer'
              onClick={spinDice}
            >
              <div 
                className='transition-transform duration-300'
                ref={d20Ref}
              >
                <Image src='/images/d20-light.png' alt='d20' width={28} height={28} className='h-auto w-auto' /> 
              </div>
            </div>
          )
        }
        {
          tab !== 'player' &&
          (
            <>
              <input 
                className="w-full row-start-1 row-end-2 col-start-2 col-end-3 border-0 rounded-lg pr-1 text-gray-800 
                focus:ring-0 shadow-md focus:shadow-lg transition-shadow duration-300 text-sm
                bg-gray-100"
                type='number'
                placeholder='0'
                min={-10}
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                onFocus={(e) => clearZero(e, hp, setHp)}
                
              />
              <input 
                className="w-full row-start-2 row-end-3 col-start-2 col-end-3 border-0 rounded-lg pr-1 text-gray-800 
                focus:ring-0 shadow-md focus:shadow-lg transition-shadow duration-300 text-sm
                bg-gray-100"
                type='number'
                placeholder='0'
                min={0}
                value={ac}
                onChange={(e) => handleChangeInput(e, ac, setAc, 3)}
                onFocus={(e) => clearZero(e, ac, setAc)}
                onWheel={(e) => e.preventDefault()}
              />
            </>
          )
        }
        
        <input 
          className={`w-full border-0 rounded-lg pr-1 text-gray-800 col-start-2 col-end-3
          focus:ring-0 shadow-md focus:shadow-lg transition-shadow duration-300 text-sm bg-gray-100
          ${tab == 'player' ? 'row-start-1 row-end-2': 'row-start-3 row-end-4'}`}
          type='number'
          placeholder='0'
          min={-11}
          max={30}
          value={init}
          onChange={(e) => handleChangeInput(e, init, setInit, 3)}
          onFocus={(e) => clearZero(e, init, setInit)}
        />
        <input 
          className={`w-full border-0 rounded-lg pr-1 text-gray-800 col-start-2 col-end-3
          focus:ring-0 shadow-md focus:shadow-lg transition-shadow duration-300 text-sm bg-gray-100
          ${tab == 'player' ? 'row-start-2 row-end-3': 'row-start-4 row-end-5'}`}
          type='number'
          placeholder='DEX'
          min={-10}
          max={10}
          value={bonus}
          onChange={(e) => handleChangeInput(e, bonus, setBonus, 3)}
          onFocus={(e) => clearZero(e, bonus, setBonus)}
        />
        <button className={`bg-gray-100 text-gray-800 p-2 rounded-md w-full
        font-semibold ${tab == 'player' && 'col-start-2 col-end-3'}`}>
          Add
        </button>
      </div>

      {/* Background image */}
      {tab != 'player' &&
        <Image 
          priority
          src='/dragon-red.png' width={180} height={200} alt='dragon'
          className='absolute left-[8vw] bottom-11 z-0 opacity-60 xs:hidden'
        />
      }
      {tab == 'player' &&
        <div className='absolute left-[8vw] bottom-11 z-0 opacity-90 xs:hidden'>
          <Image 
            priority
            src='/helmet.png' width={140} height={140} alt='barbarian helmet'
          />
        </div>
        }
    </form>
  )
}
